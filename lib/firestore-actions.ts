
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc, writeBatch } from "firebase/firestore";
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
    // Không có customerId để admin có thể thấy
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
    // Không có customerId để admin có thể thấy
    isRead: false,
    createdAt: new Date(),
  };
  return await saveNotification(notification);
}

// Sửa lại thông báo cũ để admin có thể thấy
export async function fixLegacyNotifications() {
  try {
    const notificationsQuery = query(collection(db, "notifications"))
    const querySnapshot = await getDocs(notificationsQuery)
    
    const updatePromises = querySnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data()
      // Nếu thông báo có customerId nhưng là thông báo hệ thống dành cho admin
      // LƯU Ý: KHÔNG đụng vào các thông báo dành riêng cho khách hàng như
      // "Bạn đã gửi hàng thành công ..." để tránh hiển thị ở trang admin.
      const msg: string = String(data.message || "")
      const isCustomerOnly = msg.startsWith("Bạn đã gửi hàng") || msg.startsWith("Bạn đã giữ hàng")

      if (data.customerId && !isCustomerOnly && (
        msg.includes("báo lỗi") || 
        msg.includes("giữ hàng") ||
        msg.includes("đăng xuất") ||
        msg.includes("cập nhật thông tin")
      )) {
        const notificationRef = doc(db, "notifications", docSnap.id)
        await updateDoc(notificationRef, {
          customerId: null, // Xóa customerId để admin có thể thấy
          lastUpdated: new Date()
        })
        console.log(`✅ Đã sửa thông báo: ${docSnap.id}`)
      }
    })
    
    await Promise.all(updatePromises)
    console.log("✅ Đã sửa xong thông báo cũ")
  } catch (error) {
    console.error("Lỗi sửa thông báo cũ:", error)
  }
}

// Khôi phục các thông báo gửi-hàng của khách (nếu lỡ bị migrate sai trước đó)
export async function restoreCustomerDeliveryNotifications() {
  try {
    const notificationsQuery = query(collection(db, "notifications"))
    const querySnapshot = await getDocs(notificationsQuery)
    const updates: Promise<any>[] = []

    for (const docSnap of querySnapshot.docs) {
      const data: any = docSnap.data()
      const msg: string = String(data.message || "")
      const wasCustomerOnly = msg.startsWith("Bạn đã gửi hàng") || msg.startsWith("Bạn đã giữ hàng")
      if (wasCustomerOnly && !data.customerId && data.orderId && data.lockerId) {
        // Không thể suy luận customerId nếu không lưu; bỏ qua nếu thiếu
        // Chỉ gắn cờ riêng tư để admin dropdown không hiển thị (fallback)
        const ref = doc(db, "notifications", docSnap.id)
        updates.push(updateDoc(ref, { privateToCustomer: true, lastUpdated: new Date() }))
      }
    }
    await Promise.all(updates)
    console.log("✅ Đã khôi phục phạm vi hiển thị cho thông báo gửi-hàng của khách")
  } catch (e) {
    console.error("Lỗi khôi phục thông báo khách:", e)
  }
}

// Utility: deduplicate lockers by lockerNumber (keep canonical doc id == lockerNumber)
// CHỈ xử lý duplicate, KHÔNG reset dữ liệu hiện có
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
    if (!key || items.length <= 1) continue // Chỉ xử lý khi có duplicate
    
    const canonicalId = key
    // Tìm document có ID trùng với lockerNumber (canonical)
    const keep = items.find((x) => x.id.toUpperCase() === canonicalId) || items[0]
    
    // Chỉ cập nhật nếu cần thiết, giữ nguyên dữ liệu hiện có
    if (keep.id.toUpperCase() !== canonicalId) {
      await setDoc(doc(db, "lockers", canonicalId), {
        ...keep.data,
        lockerNumber: canonicalId,
        lastUpdated: new Date(),
      })
    }
    
    // Xóa các duplicate (không phải canonical)
    for (const it of items) {
      if (it.id.toUpperCase() !== canonicalId) {
        try {
          await deleteDoc(doc(db, "lockers", it.id))
          removed += 1
          console.log(`🗑️ Xóa duplicate tủ: ${it.id} (giữ lại ${canonicalId})`)
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
  return querySnapshot.docs.map(doc => {
    const data = doc.data()
    return { 
      id: doc.id, 
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(),
    } as User
  });
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
  const lockers = querySnapshot.docs
    .map((docSnap) => {
      const data: any = docSnap.data()
      return {
        ...data,
        id: docSnap.id, // ensure Firestore doc id wins over any stored id field
        status: typeof data.status === "string" ? data.status.trim() : data.status,
        lockerNumber: typeof data.lockerNumber === "string" ? data.lockerNumber.trim() : data.lockerNumber,
        lastUpdated: data?.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated,
      } as Locker
    })
    .filter((locker) => locker && locker.lockerNumber) // Lọc bỏ các tủ không hợp lệ

  // Kiểm tra và tạo lại tủ A1-A6 nếu thiếu
  const requiredLockers = ["A1", "A2", "A3", "A4", "A5", "A6"]
  const existingNumbers = lockers.map(l => l.lockerNumber)
  const missingLockers = requiredLockers.filter(num => !existingNumbers.includes(num))
  
  if (missingLockers.length > 0) {
    console.log(`⚠️ Thiếu ${missingLockers.length} tủ, đang tạo lại...`)
    for (const lockerNumber of missingLockers) {
      try {
        const size = lockerNumber === "A1" || lockerNumber === "A4" ? "small" : 
                   lockerNumber === "A2" || lockerNumber === "A5" ? "medium" : "large"
        await setDoc(doc(db, "lockers", lockerNumber), {
          lockerNumber,
          status: "available",
          size,
          lastUpdated: new Date()
        })
        console.log(`✅ Đã tạo lại tủ ${lockerNumber}`)
      } catch (error) {
        console.error(`❌ Lỗi tạo tủ ${lockerNumber}:`, error)
      }
    }
    
    // Lấy lại danh sách tủ sau khi tạo
    const newQuerySnapshot = await getDocs(collection(db, "lockers"));
    return newQuerySnapshot.docs
      .map((docSnap) => {
        const data: any = docSnap.data()
        return {
          ...data,
          id: docSnap.id,
          status: typeof data.status === "string" ? data.status.trim() : data.status,
          lockerNumber: typeof data.lockerNumber === "string" ? data.lockerNumber.trim() : data.lockerNumber,
          lastUpdated: data?.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated,
        } as Locker
      })
      .filter((locker) => locker && locker.lockerNumber)
  }

  return lockers
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

// Lấy báo lỗi theo lockerId
export async function getErrorReportsByLockerId(lockerId: string): Promise<ErrorReport[]> {
  const q = query(
    collection(db, "errors"), 
    where("lockerId", "==", lockerId)
  );
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map((docSnap) => {
    const data: any = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      resolvedAt: data?.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt,
      receivedAt: data?.receivedAt?.toDate ? data.receivedAt.toDate() : data.receivedAt,
      processingStartedAt: data?.processingStartedAt?.toDate ? data.processingStartedAt.toDate() : data.processingStartedAt,
      closedAt: data?.closedAt?.toDate ? data.closedAt.toDate() : data.closedAt,
      customerNotifiedAt: data?.customerNotifiedAt?.toDate ? data.customerNotifiedAt.toDate() : data.customerNotifiedAt,
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

// Cập nhật thời gian tủ (chỉ cập nhật lastUpdated)
export async function updateLockerTimestamp(lockerId: string) {
  const lockerRef = doc(db, "lockers", lockerId);
  await updateDoc(lockerRef, { 
    lastUpdated: new Date() 
  });
  console.log(`🕐 Cập nhật thời gian tủ ${lockerId}`);
}

// Cập nhật trạng thái tủ - CHỈ cập nhật trạng thái, KHÔNG reset dữ liệu
export async function updateLockerStatus(lockerId: string, status: string, orderId?: string) {
  const lockerRef = doc(db, "lockers", lockerId);
  const updateData: any = { 
    status, 
    lastUpdated: new Date() 
  };
  
  // Chỉ cập nhật currentOrderId nếu được cung cấp
  if (orderId !== undefined) {
    updateData.currentOrderId = orderId;
  } else if (status === "available") {
    // Khi tủ trở về trạng thái available, xóa currentOrderId
    updateData.currentOrderId = null;
  }
  
  await updateDoc(lockerRef, updateData);
  console.log(`✅ Cập nhật tủ ${lockerId}: ${status}${orderId ? ` (Order: ${orderId})` : ''}`);
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

// Xử lý nhận hàng - cập nhật transaction và reset tủ
export async function pickupPackage(transactionId: string) {
  try {
    // Lấy thông tin transaction để biết lockerId
    const transactionRef = doc(db, "transactions", transactionId);
    const transactionSnap = await getDoc(transactionRef);
    
    if (!transactionSnap.exists()) {
      throw new Error("Không tìm thấy giao dịch");
    }
    
    const transactionData = transactionSnap.data();
    const lockerId = transactionData.lockerId;
    
    // Cập nhật transaction status thành picked_up
    await updateTransactionStatus(transactionId, "picked_up");
    
    // Reset tủ về trạng thái available và xóa tất cả thông tin liên quan
    const lockerRef = doc(db, "lockers", lockerId);
    await updateDoc(lockerRef, {
      status: "available",
      currentOrderId: null,
      lastUpdated: new Date()
    });
    
    console.log(`✅ Đã xử lý nhận hàng: Transaction ${transactionId}, Locker ${lockerId} đã được reset hoàn toàn`);
    
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xử lý nhận hàng:", error);
    throw error;
  }
}

// Đánh dấu thông báo đã đọc
export async function markNotificationAsRead(notificationId: string) {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { isRead: true });
}

// Đánh dấu tất cả thông báo của khách hàng đã đọc
export async function markAllNotificationsAsRead(customerId: string) {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, where("customerId", "==", customerId), where("isRead", "==", false));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
    console.log(`✅ Đã đánh dấu tất cả thông báo đã đọc cho customer ${customerId}`);
  } catch (error) {
    console.error("Lỗi đánh dấu tất cả thông báo đã đọc:", error);
    throw error;
  }
}

// Đánh dấu tất cả thông báo hệ thống (dành cho admin) là đã đọc
export async function markAllAdminNotificationsAsRead() {
  try {
    const notificationsRef = collection(db, "notifications")
    // Chỉ lấy thông báo chưa đọc và không gắn customerId (system notifications)
    const q = query(notificationsRef, where("isRead", "==", false), where("customerId", "==", null))
    const snap = await getDocs(q)

    if (snap.empty) return

    const batch = writeBatch(db)
    snap.docs.forEach((d) => {
      batch.update(d.ref, { isRead: true })
    })
    await batch.commit()
    console.log(`✅ Đã đánh dấu ${snap.size} thông báo hệ thống là đã đọc`)
  } catch (e) {
    console.error("Lỗi đánh dấu tất cả thông báo hệ thống đã đọc:", e)
    throw e
  }
}

// Cập nhật trạng thái người dùng
export async function updateUserStatus(userId: string, isActive: boolean) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      isActive: isActive,
      lastUpdated: new Date()
    })
    console.log(`✅ Đã cập nhật trạng thái người dùng ${userId}: ${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'}`)
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái người dùng:", error)
    throw error
  }
}

// Cập nhật lần đăng nhập cuối
export async function updateLastLogin(userId: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      lastLoginAt: new Date(),
      lastUpdated: new Date()
    })
    console.log(`✅ Đã cập nhật lần đăng nhập cuối cho user ${userId}`)
  } catch (error) {
    console.error("Lỗi cập nhật lần đăng nhập cuối:", error)
    throw error
  }
}

// Cập nhật lần truy cập cuối (khi user thoát browser)
export async function updateLastAccess(userId: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      lastAccessAt: new Date(),
      lastUpdated: new Date()
    })
    console.log(`✅ Đã cập nhật lần truy cập cuối cho user ${userId}`)
  } catch (error) {
    console.error("Lỗi cập nhật lần truy cập cuối:", error)
    throw error
  }
}

// Cập nhật dữ liệu người dùng cũ (thêm createdAt và lastLoginAt nếu chưa có)
export async function updateLegacyUsers() {
  try {
    const users = await getUsers()
    const usersToUpdate = users.filter(user => 
      !user.createdAt || 
      user.createdAt.toString() === 'Invalid Date' ||
      !user.lastLoginAt
    )
    
    if (usersToUpdate.length === 0) {
      console.log("✅ Tất cả người dùng đã có đầy đủ dữ liệu")
      return
    }
    
    const updatePromises = usersToUpdate.map(user => {
      const userRef = doc(db, "users", user.id)
      const updateData: any = {
        lastUpdated: new Date()
      }
      
      // Thêm createdAt nếu chưa có
      if (!user.createdAt || user.createdAt.toString() === 'Invalid Date') {
        updateData.createdAt = new Date("2025-01-01") // Ngày mặc định cho dữ liệu cũ
      }
      
      // Thêm lastLoginAt nếu chưa có (đặt bằng createdAt hoặc ngày hiện tại)
      if (!user.lastLoginAt) {
        updateData.lastLoginAt = user.createdAt && user.createdAt.toString() !== 'Invalid Date' 
          ? user.createdAt 
          : new Date("2025-01-01")
      }
      
      return updateDoc(userRef, updateData)
    })
    
    await Promise.all(updatePromises)
    console.log(`✅ Đã cập nhật dữ liệu cho ${usersToUpdate.length} người dùng`)
  } catch (error) {
    console.error("Lỗi cập nhật dữ liệu người dùng cũ:", error)
  }
}

// ========== XỬ LÝ LỖI VỚI QUY TRÌNH HOÀN CHỈNH ==========

// Tiếp nhận lỗi (chuyển từ pending → received)
export async function receiveErrorReport(errorId: string, adminNotes?: string) {
  const errorRef = doc(db, "errors", errorId);
  await updateDoc(errorRef, {
    status: "received",
    processingStage: "received",
    receivedAt: new Date(),
    adminNotes: adminNotes || "",
    lastUpdated: new Date()
  });
  console.log(`✅ Đã tiếp nhận lỗi: ${errorId}`);
}

// Bắt đầu xử lý lỗi (chuyển từ received → processing)
export async function startProcessingError(errorId: string, adminNotes?: string) {
  const errorRef = doc(db, "errors", errorId);
  
  // Lấy thông tin lỗi để biết lockerId
  const errorSnap = await getDoc(errorRef);
  if (!errorSnap.exists()) {
    throw new Error("Không tìm thấy báo lỗi");
  }
  
  const errorData = errorSnap.data();
  const lockerId = errorData.lockerId;
  
  // Cập nhật trạng thái lỗi
  await updateDoc(errorRef, {
    status: "processing",
    processingStage: "processing",
    processingStartedAt: new Date(),
    adminNotes: adminNotes || "",
    lastUpdated: new Date()
  });
  
  // Cập nhật trạng thái tủ thành maintenance nếu có lockerId
  if (lockerId) {
    await updateLockerStatus(lockerId, "maintenance");
    console.log(`🔧 Đã đặt tủ ${lockerId} vào chế độ bảo trì`);
  }
  
  console.log(`🔧 Đã bắt đầu xử lý lỗi: ${errorId}`);
}

// Hoàn thành xử lý lỗi (chuyển từ processing → resolved)
export async function resolveErrorReport(errorId: string, adminNotes?: string) {
  const errorRef = doc(db, "errors", errorId);
  
  // Lấy thông tin lỗi để biết lockerId
  const errorSnap = await getDoc(errorRef);
  if (!errorSnap.exists()) {
    throw new Error("Không tìm thấy báo lỗi");
  }
  
  const errorData = errorSnap.data();
  const lockerId = errorData.lockerId;
  
  // Cập nhật trạng thái lỗi
  await updateDoc(errorRef, {
    status: "resolved",
    processingStage: "resolved",
    resolvedAt: new Date(),
    adminNotes: adminNotes || "",
    lastUpdated: new Date()
  });
  
  // Cập nhật trạng thái tủ sau khi xử lý lỗi:
  // - Nếu tủ vẫn đang có đơn (currentOrderId tồn tại) → để lại trạng thái "occupied"
  // - Ngược lại → đưa về "available"
  if (lockerId) {
    try {
      const lockerRef = doc(db, "lockers", lockerId)
      const lockerSnap = await getDoc(lockerRef)
      const lockerData: any = lockerSnap.exists() ? lockerSnap.data() : null
      const hasActiveOrder = !!(lockerData && lockerData.currentOrderId)
      if (hasActiveOrder) {
        await updateLockerStatus(lockerId, "occupied")
        console.log(`✅ Tủ ${lockerId} còn đơn đang gửi, giữ trạng thái occupied`)
      } else {
        await updateLockerStatus(lockerId, "available")
        console.log(`✅ Tủ ${lockerId} không còn đơn, đưa về trạng thái available`)
      }
    } catch (e) {
      // Nếu có lỗi khi đọc tủ, fallback an toàn: KHÔNG xóa dữ liệu đơn
      await updateLockerStatus(lockerId, "occupied")
      console.warn(`⚠️ Không đọc được dữ liệu tủ ${lockerId}, tạm giữ occupied để tránh mất dữ liệu`)
    }
  }
  
  console.log(`✅ Đã hoàn thành xử lý lỗi: ${errorId}`);
}

// Thông báo khách hàng (chuyển từ resolved → notified)
export async function notifyCustomerAboutErrorResolution(errorId: string, customerId: string) {
  try {
    // Lấy thông tin error report để lấy lockerId
    const errorDoc = await getDoc(doc(db, "errors", errorId));
    const errorData = errorDoc.data();
    
    // Cập nhật trạng thái lỗi
    const errorRef = doc(db, "errors", errorId);
    await updateDoc(errorRef, {
      processingStage: "notified",
      customerNotifiedAt: new Date(),
      lastUpdated: new Date()
    });

    // Tạo thông báo cho khách hàng với thông tin liên kết
    const customerNotification = {
      type: "info" as const,
      message: "Lỗi bạn báo cáo đã được xử lý thành công. Cảm ơn bạn đã phản hồi!",
      customerId: customerId,
      errorId: errorId, // Thêm errorId để liên kết
      lockerId: errorData?.lockerId, // Thêm lockerId từ error report
      isRead: false,
      createdAt: new Date(),
    };
    
    await saveNotification(customerNotification);
    console.log(`📢 Đã thông báo khách hàng về việc xử lý lỗi: ${errorId}`);
  } catch (error) {
    console.error("Lỗi thông báo khách hàng:", error);
    throw error;
  }
}

// Đóng lỗi (chuyển từ notified → closed)
export async function closeErrorReport(errorId: string) {
  const errorRef = doc(db, "errors", errorId);
  await updateDoc(errorRef, {
    status: "closed",
    processingStage: "notified",
    closedAt: new Date(),
    lastUpdated: new Date()
  });
  console.log(`🔒 Đã đóng lỗi: ${errorId}`);
}

// Xử lý thông báo lỗi - cập nhật trạng thái và tạo thông báo cho khách hàng
export async function handleErrorNotification(notificationId: string, errorId: string, customerId: string) {
  try {
    // Lấy thông tin error report để lấy lockerId
    const errorDoc = await getDoc(doc(db, "errors", errorId));
    const errorData = errorDoc.data();
    
    // Cập nhật trạng thái báo lỗi thành đã xử lý
    await resolveErrorReport(errorId, "Đã xử lý lỗi từ admin");
    
    // Đánh dấu thông báo đã đọc
    await markNotificationAsRead(notificationId);
    
    // Tạo thông báo cho khách hàng với thông tin liên kết
    const customerNotification = {
      type: "info" as const,
      message: "Lỗi bạn báo cáo đã được xử lý thành công. Cảm ơn bạn đã phản hồi!",
      customerId: customerId,
      errorId: errorId, // Thêm errorId để liên kết
      lockerId: errorData?.lockerId, // Thêm lockerId từ error report
      isRead: false,
      createdAt: new Date(),
    };
    
    await saveNotification(customerNotification);
    
    console.log(`✅ Đã xử lý thông báo lỗi: ${notificationId}, Error: ${errorId}`);
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xử lý thông báo lỗi:", error);
    throw error;
  }
}
