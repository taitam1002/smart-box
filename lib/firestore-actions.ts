
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import type { User, Order, ErrorReport, Notification, Locker } from "@/lib/types";

// Lưu thông tin tài khoản người dùng
export async function saveUser(user: User) {
  return await addDoc(collection(db, "users"), user);
}

// Lưu lịch sử giao dịch (Order)
export async function saveTransaction(order: Omit<Order, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "transactions"), order);
  return docRef.id;
}

// Lưu báo lỗi/feedback
export async function saveError(error: Omit<ErrorReport, "id">) {
  return await addDoc(collection(db, "errors"), error);
}

// Lưu log hệ thống
export async function saveLog(log: Record<string, any>) {
  return await addDoc(collection(db, "logs"), log);
}

// Lưu cấu hình hệ thống
export async function saveSetting(setting: Record<string, any>) {
  return await addDoc(collection(db, "settings"), setting);
}

// Lưu thông tin tủ thông minh
export async function saveLocker(locker: Locker) {
  // Normalize locker number and enforce uniqueness at the database level
  const normalizedNumber = typeof locker.lockerNumber === "string" ? locker.lockerNumber.trim().toUpperCase() : locker.lockerNumber

  // Check existing lockers with same number (handles legacy docs where id != lockerNumber)
  const dupQuery = query(collection(db, "lockers"), where("lockerNumber", "==", normalizedNumber))
  const dupSnap = await getDocs(dupQuery)
  if (!dupSnap.empty) {
    throw new Error(`Số tủ "${normalizedNumber}" đã tồn tại`)
  }

  const payload: Locker = {
    ...locker,
    lockerNumber: normalizedNumber,
    lastUpdated: new Date(),
  } as Locker

  // Use lockerNumber as document ID to prevent future duplicates created concurrently
  await setDoc(doc(db, "lockers", String(normalizedNumber)), payload)
  return { id: String(normalizedNumber) }
}

// Lưu thông báo hệ thống
export async function saveNotification(notification: Omit<Notification, "id">) {
  return await addDoc(collection(db, "notifications"), notification);
}

// Tạo thông báo đăng xuất
export async function createLogoutNotification(user: { id: string; name: string; email: string; role: string }) {
  const notification = {
    type: "info" as const,
    message: `Người dùng ${user.name} (${user.email}) - ${user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'} đã đăng xuất khỏi hệ thống`,
    customerId: user.id,
    isRead: false,
    createdAt: new Date(),
  };
  return await saveNotification(notification);
}

// Tạo thông báo cập nhật profile
export async function createProfileUpdateNotification(user: { id: string; name: string; email: string; role: string }, changes: string[]) {
  const notification = {
    type: "customer_action" as const,
    message: `Người dùng ${user.name} (${user.email}) - ${user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'} đã cập nhật thông tin: ${changes.join(', ')}`,
    customerId: user.id,
    isRead: false,
    createdAt: new Date(),
  };
  return await saveNotification(notification);
}

// Utility: deduplicate lockers by lockerNumber (keep canonical doc id == lockerNumber)
export async function dedupeLockers(): Promise<{ removed: number }> {
  const snap = await getDocs(collection(db, "lockers"))
  const groups = new Map<string, Array<{ id: string; data: any }>>()
  snap.docs.forEach((d) => {
    const data: any = d.data()
    const key = String((data?.lockerNumber ?? "").toString().trim().toUpperCase())
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ id: d.id, data })
  })

  let removed = 0
  for (const [key, items] of groups.entries()) {
    if (!key) continue
    const canonicalId = key
    // Ensure canonical doc exists with correct payload
    const keep = items.find((x) => x.id.toUpperCase() === canonicalId) || items[0]
    await setDoc(doc(db, "lockers", canonicalId), {
      ...keep.data,
      lockerNumber: canonicalId,
      lastUpdated: new Date(),
    })
    // Delete others
    for (const it of items) {
      if (it.id.toUpperCase() !== canonicalId) {
        try {
          await deleteDoc(doc(db, "lockers", it.id))
          removed += 1
        } catch {}
      }
    }
  }
  return { removed }
}

// ========== CÁC HÀM ĐỌC DỮ LIỆU ==========

// Lấy tất cả người dùng
export async function getUsers(): Promise<User[]> {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

// Tìm user theo email (trả về kèm id)
export async function findUserByEmail(email: string): Promise<User | null> {
  const q = query(collection(db, "users"), where("email", "==", email))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...(d.data() as Omit<User, "id">) } as User
}

// Lấy tất cả tủ thông minh
export async function getLockers(): Promise<Locker[]> {
  const querySnapshot = await getDocs(collection(db, "lockers"));
  return querySnapshot.docs.map((docSnap) => {
    const data: any = docSnap.data()
    return {
      ...data,
      id: docSnap.id, // ensure Firestore doc id wins over any stored id field
      status: typeof data.status === "string" ? data.status.trim() : data.status,
      lockerNumber: typeof data.lockerNumber === "string" ? data.lockerNumber.trim() : data.lockerNumber,
      lastUpdated: data?.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated,
    } as Locker
  })
}

// Lấy tất cả giao dịch
export async function getTransactions(): Promise<Order[]> {
  const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => {
    const data: any = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      deliveredAt: data?.deliveredAt?.toDate ? data.deliveredAt.toDate() : data.deliveredAt,
      pickedUpAt: data?.pickedUpAt?.toDate ? data.pickedUpAt.toDate() : data.pickedUpAt,
    } as Order
  })
}

// Lấy giao dịch của một người dùng
export async function getUserTransactions(userId: string): Promise<Order[]> {
  // Remove orderBy to avoid composite index requirement; sort client-side
  const q = query(
    collection(db, "transactions"), 
    where("senderId", "==", userId)
  );
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map((docSnap) => {
    const data: any = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      deliveredAt: data?.deliveredAt?.toDate ? data.deliveredAt.toDate() : data.deliveredAt,
      pickedUpAt: data?.pickedUpAt?.toDate ? data.pickedUpAt.toDate() : data.pickedUpAt,
    } as Order
  })
  return items.sort((a, b) => {
    const ta = (a as any).createdAt?.getTime?.() ?? 0
    const tb = (b as any).createdAt?.getTime?.() ?? 0
    return tb - ta
  })
}

// Lấy tất cả báo lỗi
export async function getErrorReports(): Promise<ErrorReport[]> {
  const q = query(collection(db, "errors"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ErrorReport));
}

// Lấy báo lỗi của một người dùng
export async function getUserErrorReports(userId: string): Promise<ErrorReport[]> {
  // Avoid requiring composite index by removing orderBy in Firestore query
  // and sorting client-side. Also normalize timestamp fields.
  const q = query(
    collection(db, "errors"), 
    where("customerId", "==", userId)
  );
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map((docSnap) => {
    const data: any = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      resolvedAt: data?.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt,
    } as ErrorReport
  })
  return items.sort((a, b) => {
    const ta = (a as any).createdAt?.getTime?.() ?? 0
    const tb = (b as any).createdAt?.getTime?.() ?? 0
    return tb - ta
  })
}

// Lấy tất cả thông báo
export async function getNotifications(): Promise<Notification[]> {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => {
    const data: any = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    } as Notification
  })
}

// Lấy thông báo chưa đọc
export async function getUnreadNotifications(): Promise<Notification[]> {
  const q = query(
    collection(db, "notifications"), 
    where("isRead", "==", false),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
}

// ========== CÁC HÀM CẬP NHẬT DỮ LIỆU ==========

// Cập nhật trạng thái tủ
export async function updateLockerStatus(lockerId: string, status: string, orderId?: string) {
  const lockerRef = doc(db, "lockers", lockerId);
  const updateData: any = { 
    status, 
    lastUpdated: new Date() 
  };
  if (orderId !== undefined) {
    updateData.currentOrderId = orderId;
  }
  await updateDoc(lockerRef, updateData);
}

// Cập nhật trạng thái giao dịch
export async function updateTransactionStatus(transactionId: string, status: string) {
  const transactionRef = doc(db, "transactions", transactionId);
  const updateData: any = { status };
  
  if (status === "picked_up") {
    updateData.pickedUpAt = new Date();
  }
  
  await updateDoc(transactionRef, updateData);
}

// Đánh dấu thông báo đã đọc
export async function markNotificationAsRead(notificationId: string) {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { isRead: true });
}

// Cập nhật trạng thái báo lỗi
export async function updateErrorReportStatus(errorId: string, status: string) {
  const errorRef = doc(db, "errors", errorId);
  const updateData: any = { status };
  
  if (status === "resolved") {
    updateData.resolvedAt = new Date();
  }
  
  await updateDoc(errorRef, updateData);
}
