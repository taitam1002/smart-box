export async function getLatestDeliveryInfoByLocker(lockerNumber: string) {
  try {
    const normalized = lockerNumber?.trim()?.toUpperCase()
    if (!normalized) return null

    const deliveryQuery = query(
      collection(db, "delivery_info"),
      where("lockerNumber", "==", normalized),
      orderBy("createdAt", "desc"),
      limit(1)
    )
    const snap = await getDocs(deliveryQuery)
    if (snap.empty) return null

    const docSnap = snap.docs[0]
    const data: any = docSnap.data()
    if (!data?.fingerprintVerified) return null

    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    }
  } catch (error) {
    console.error("Lỗi lấy delivery_info theo locker:", error)
    return null
  }
}

import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc, writeBatch, deleteField, limit } from "firebase/firestore";
import type { User, Order, ErrorReport, Notification, Locker, DeliveryInfo, DoorStatus } from "@/lib/types";

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
    door: locker.door || "closed", // Mặc định door = "closed" nếu chưa có
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

// Lưu thông tin giao hàng (số điện thoại, loại tủ, mã tủ, tên)
export async function saveDeliveryInfo(deliveryInfo: Omit<DeliveryInfo, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "delivery_info"), deliveryInfo);
  return docRef.id;
}

// Cập nhật thông tin giao hàng
export async function updateDeliveryInfo(deliveryInfoId: string, updates: Partial<Omit<DeliveryInfo, "id">>): Promise<void> {
  const docRef = doc(db, "delivery_info", deliveryInfoId);
  await updateDoc(docRef, updates);
}

// Xóa thông tin giao hàng
export async function deleteDeliveryInfo(deliveryInfoId: string): Promise<void> {
  const docRef = doc(db, "delivery_info", deliveryInfoId);
  await deleteDoc(docRef);
}

// Xóa delivery_info nếu đã có orderId (đảm bảo transaction đã được tạo)
export async function cleanupDeliveryInfo(deliveryInfoId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "delivery_info", deliveryInfoId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      console.log(`ℹ️ delivery_info ${deliveryInfoId} đã bị xóa trước đó`)
      return false
    }

    const data = snapshot.data()

    // Chỉ xóa nếu đã có orderId (nghĩa là transaction đã được tạo thành công)
    if (data.orderId) {
      await deleteDoc(docRef)
      console.log(`🗑️ Đã xóa delivery_info ${deliveryInfoId} (orderId: ${data.orderId})`)
      return true
    } else {
      console.log(`⚠️ delivery_info ${deliveryInfoId} chưa có orderId, không xóa`)
      return false
    }
  } catch (error) {
    console.error(`❌ Lỗi cleanup delivery_info ${deliveryInfoId}:`, error)
    return false
  }
}

// Tự động xóa delivery_info có fingerprintData và reset tủ (chỉ khi đã có orderId)
export async function autoCleanupDeliveryInfoWithLockerReset(deliveryInfoId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "delivery_info", deliveryInfoId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return false
    }

    const data = snapshot.data()

    // Chỉ xử lý nếu có fingerprintData và là đơn giữ hàng
    if (!data.fingerprintData || data.deliveryType !== "giu") {
      return false
    }

    // ✅ QUAN TRỌNG: Kiểm tra fingerprintVerified
    // Nếu fingerprintVerified = true, document đã được xác thực thành công → KHÔNG xóa
    const isFingerprintVerified = (value: any) => {
      if (value === true || value === 1) return true
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase()
        return normalized === "true" || normalized === "1"
      }
      return !!value
    }

    if (isFingerprintVerified(data.fingerprintVerified)) {
      console.log(`⚠️ delivery_info ${deliveryInfoId} đã được xác thực vân tay (fingerprintVerified = true), không xóa`)
      return false
    }

    // QUAN TRỌNG: Kiểm tra xem đã có orderId chưa
    // Nếu chưa có orderId, nghĩa là transaction chưa được tạo → KHÔNG xóa
    if (!data.orderId) {
      console.log(`⚠️ delivery_info ${deliveryInfoId} chưa có orderId, đợi transaction được tạo`)
      return false
    }

    const lockerId = data.lockerId

    // Xóa document
    await deleteDoc(docRef)
    console.log(`✅ Đã xóa delivery_info ${deliveryInfoId} (orderId: ${data.orderId})`)

    // Reset tủ về available, đóng cửa
    if (lockerId) {
      try {
        await updateLockerStatus(lockerId, "available", undefined, { doorState: "closed" })
        console.log(`✅ Đã reset tủ ${lockerId} về available`)
      } catch (e) {
        console.error(`❌ Lỗi reset tủ ${lockerId}:`, e)
      }
    }

    return true
  } catch (error) {
    console.error(`❌ Lỗi auto cleanup ${deliveryInfoId}:`, error)
    return false
  }
}

// Xóa delivery_info sau khi đã xác thực vân tay thành công (chỉ khi có fingerprintData)
export async function cleanupVerifiedDeliveryInfo(deliveryInfoId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "delivery_info", deliveryInfoId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return false
    }

    const data = snapshot.data()

    const isFingerprintVerified = (value: any) => {
      if (value === true || value === 1) return true
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase()
        return normalized === "true" || normalized === "1"
      }
      return !!value
    }

    // ✅ QUAN TRỌNG: Chỉ xóa khi có fingerprintData, đã xác thực vân tay và có orderId
    if (data.deliveryType === "giu" && 
        data.fingerprintData && // Phải có fingerprintData
        isFingerprintVerified(data.fingerprintVerified) && 
        data.orderId) {
      await deleteDoc(docRef)
      console.log(`✅ Đã xóa delivery_info ${deliveryInfoId} sau khi xác thực vân tay thành công (orderId: ${data.orderId})`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ Lỗi cleanup verified delivery_info ${deliveryInfoId}:`, error)
    return false
  }
}

// Xóa delivery_info cho đơn gửi hàng SMS khi receive = true
export async function cleanupReceivedDeliveryInfo(deliveryInfoId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "delivery_info", deliveryInfoId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return false
    }

    const data = snapshot.data()

    // Chỉ xóa nếu là đơn gửi hàng (SMS) và đã nhận hàng (receive = true) và có orderId
    if (data.deliveryType === "gui" && data.receive === true && data.orderId) {
      await deleteDoc(docRef)
      console.log(`✅ Đã xóa delivery_info ${deliveryInfoId} sau khi nhận hàng (receive = true, orderId: ${data.orderId})`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ Lỗi cleanup received delivery_info ${deliveryInfoId}:`, error)
    return false
  }
}

// Lấy delivery_info của một người dùng (để tạo transaction nếu chưa có)
export async function getUserDeliveryInfo(userId: string): Promise<DeliveryInfo[]> {
  const q = query(
    collection(db, "delivery_info"),
    where("senderId", "==", userId),
    where("deliveryType", "==", "giu"), // Chỉ lấy đơn giữ hàng
    where("fingerprintVerified", "==", true) // Chỉ lấy đơn đã xác thực vân tay
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => {
    const data: any = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    } as DeliveryInfo
  })
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
        } catch { }
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

// Cập nhật tất cả tủ hiện có để thêm trường door nếu chưa có
export async function updateAllLockersWithDoorField() {
  try {
    const querySnapshot = await getDocs(collection(db, "lockers"));
    const batch = writeBatch(db);
    let updateCount = 0;

    querySnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.door === undefined || data.door === null) {
        batch.update(docSnap.ref, {
          door: "closed",
          lastUpdated: new Date()
        });
        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Đã cập nhật ${updateCount} tủ với trường door = "closed"`);
    } else {
      console.log("✅ Tất cả tủ đã có trường door");
    }

    return { updated: updateCount };
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật trường door cho tủ:", error);
    throw error;
  }
}

// Lấy tất cả tủ thông minh
export async function getLockers(): Promise<Locker[]> {
  const querySnapshot = await getDocs(collection(db, "lockers"));

  // Xóa các field legacy currentHolder* nếu còn sót
  const cleanupPromises: Promise<any>[] = []
  querySnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data() as any
    const updates: any = {}
    if (data.currentHolder !== undefined) updates.currentHolder = deleteField()
    if (data.currentHolderId !== undefined) updates.currentHolderId = deleteField()
    if (data.currentHolderName !== undefined) updates.currentHolderName = deleteField()
    if (data.currentHolderPhone !== undefined) updates.currentHolderPhone = deleteField()
    if (data.currentTransactionType !== undefined) updates.currentTransactionType = deleteField()
    if (Object.keys(updates).length > 0) {
      cleanupPromises.push(
        updateDoc(doc(db, "lockers", docSnap.id), updates).catch((err) =>
          console.error(`⚠️ Không thể xóa field legacy ở tủ ${docSnap.id}:`, err)
        )
      )
    }
  })
  if (cleanupPromises.length > 0) {
    await Promise.all(cleanupPromises)
    console.log(`🧹 Đã dọn ${cleanupPromises.length} tủ khỏi field currentHolder legacy`)
  }

  const lockers = querySnapshot.docs
    .map((docSnap) => {
      const data: any = docSnap.data()
      return {
        ...data,
        id: docSnap.id, // ensure Firestore doc id wins over any stored id field
        status: typeof data.status === "string" ? data.status.trim() : data.status,
        lockerNumber: typeof data.lockerNumber === "string" ? data.lockerNumber.trim() : data.lockerNumber,
        door: data.door || "closed", // Mặc định door = "closed" nếu chưa có
        lastUpdated: data?.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated,
      } as Locker
    })
    .filter((locker) => locker && locker.lockerNumber) // Lọc bỏ các tủ không hợp lệ

  // Tự động cập nhật trường door cho các tủ chưa có
  const lockersWithoutDoor = lockers.filter(l => !l.door || (l as any).door === undefined)
  if (lockersWithoutDoor.length > 0) {
    console.log(`⚠️ Phát hiện ${lockersWithoutDoor.length} tủ chưa có trường door, đang cập nhật...`)
    try {
      await updateAllLockersWithDoorField()
    } catch (e) {
      console.error("Lỗi cập nhật trường door:", e)
    }
  }

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
          door: "closed", // Mặc định cửa đóng
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
          door: data.door || "closed", // Mặc định door = "closed" nếu chưa có
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
type UpdateLockerStatusOptions = {
  doorState?: DoorStatus
}

export async function updateLockerStatus(
  lockerId: string,
  status: string,
  orderId?: string,
  options?: UpdateLockerStatusOptions
) {
  // Thử với lockerId trước (có thể là document ID hoặc lockerNumber)
  let lockerRef = doc(db, "lockers", lockerId);

  try {
    const updateData: any = {
      status,
      lastUpdated: new Date(),
      // Quy ước mặc định: occupied -> open, ngược lại closed
      door: options?.doorState ?? (status === "occupied" ? "open" : "closed"),
    };

    // Chỉ cập nhật currentOrderId nếu được cung cấp
    if (orderId !== undefined) {
      updateData.currentOrderId = orderId;
    } else if (status === "available") {
      // Khi tủ trở về trạng thái available, xóa currentOrderId
      updateData.currentOrderId = null;
    }

    // Luôn xóa các trường giữ thông tin người dùng để tránh sót dữ liệu
    updateData.currentHolder = deleteField()
    updateData.currentHolderId = deleteField()
    updateData.currentHolderName = deleteField()
    updateData.currentHolderPhone = deleteField()
    updateData.currentTransactionType = deleteField()

    await updateDoc(lockerRef, updateData);
    console.log(`✅ Cập nhật tủ ${lockerId}: ${status}${orderId ? ` (Order: ${orderId})` : ''}`);
  } catch (error: any) {
    // Nếu lỗi "document not found", có thể document ID là lockerNumber
    if (error?.code === 'not-found' || error?.message?.includes('not found')) {
      console.log(`⚠️ Không tìm thấy tủ với ID ${lockerId}, có thể cần dùng lockerNumber`)
      throw error; // Re-throw để caller xử lý
    } else {
      throw error;
    }
  }
}

// Hàm để fix trạng thái tủ cho các transaction đã có nhưng tủ chưa được cập nhật
// CHỈ cập nhật nếu tủ đang available VÀ chưa có transaction khác đang sử dụng
export async function fixLockerStatusForTransactions() {
  try {
    // Lấy tất cả transactions có status "delivered" (cả "send" và "hold")
    const txQuery = query(
      collection(db, "transactions"),
      where("status", "==", "delivered")
    );
    const txSnapshot = await getDocs(txQuery);

    console.log(`🔍 Tìm thấy ${txSnapshot.size} đơn chưa lấy`);

    for (const txDoc of txSnapshot.docs) {
      const txData = txDoc.data();
      const lockerId = txData.lockerId;
      const orderId = txDoc.id;

      if (!lockerId) continue;

      // Lấy thông tin tủ
      let lockerRef = doc(db, "lockers", lockerId);
      let lockerSnap = await getDoc(lockerRef);

      // Nếu không tìm thấy với lockerId, thử tìm bằng lockerNumber
      if (!lockerSnap.exists()) {
        const lockerQuery = query(
          collection(db, "lockers"),
          where("lockerNumber", "==", lockerId)
        );
        const lockerQuerySnap = await getDocs(lockerQuery);

        if (!lockerQuerySnap.empty) {
          lockerRef = lockerQuerySnap.docs[0].ref;
          lockerSnap = await getDoc(lockerRef);
        }
      }

      if (!lockerSnap.exists()) {
        console.log(`⚠️ Không tìm thấy tủ với ID ${lockerId}, bỏ qua transaction ${orderId}`);
        continue;
      }

      const lockerData = lockerSnap.data();
      const currentStatus = lockerData.status?.trim() || "available";
      const currentOrderId = lockerData.currentOrderId;

      // QUAN TRỌNG: Chỉ cập nhật nếu:
      // 1. Tủ đang ở trạng thái "available" (chưa bị chiếm bởi đơn khác)
      // 2. Tủ chưa có currentOrderId hoặc currentOrderId trùng với orderId hiện tại
      // 3. Transaction chưa được picked_up
      if (currentStatus === "available" && (!currentOrderId || currentOrderId === orderId)) {
        await updateDoc(lockerRef, {
          status: "occupied",
          currentOrderId: orderId,
          currentHolder: deleteField(),
          currentHolderId: deleteField(),
          currentHolderName: deleteField(),
          currentHolderPhone: deleteField(),
          currentTransactionType: deleteField(),
          lastUpdated: new Date()
        });
        console.log(`✅ Đã fix trạng thái tủ ${lockerData.lockerNumber || lockerId} -> occupied (Order: ${orderId})`);
      } else if (currentStatus === "occupied" && currentOrderId === orderId) {
        // Tủ đã được cập nhật đúng, không cần làm gì
        console.log(`✓ Tủ ${lockerData.lockerNumber || lockerId} đã được cập nhật đúng với Order: ${orderId}`);
      } else if (currentStatus === "occupied" && currentOrderId !== orderId) {
        // Tủ đang được sử dụng bởi đơn khác, không cập nhật
        console.log(`⚠️ Tủ ${lockerData.lockerNumber || lockerId} đang được sử dụng bởi Order: ${currentOrderId}, bỏ qua Order: ${orderId}`);
      } else {
        // Tủ không ở trạng thái available, không cập nhật
        console.log(`⚠️ Tủ ${lockerData.lockerNumber || lockerId} đang ở trạng thái "${currentStatus}", không cập nhật`);
      }
    }

    console.log("✅ Hoàn thành fix trạng thái tủ");
  } catch (error) {
    console.error("❌ Lỗi khi fix trạng thái tủ:", error);
    throw error;
  }
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
    
    // Lấy thông tin tủ để biết lockerNumber
    let lockerNumber = lockerId;
    try {
      const lockerRef = doc(db, "lockers", lockerId);
      const lockerSnap = await getDoc(lockerRef);
      if (lockerSnap.exists()) {
        const lockerData = lockerSnap.data();
        lockerNumber = lockerData.lockerNumber || lockerId;
      }
    } catch (e) {
      console.warn("Không thể lấy thông tin tủ:", e);
    }

    // Cập nhật transaction status thành picked_up
    await updateTransactionStatus(transactionId, "picked_up");

    // Reset tủ về trạng thái available, mở cửa và xóa tất cả thông tin liên quan
    const lockerRef = doc(db, "lockers", lockerId);
    await updateDoc(lockerRef, {
      status: "available",
      currentOrderId: null,
      currentHolder: deleteField(),
      currentHolderId: deleteField(),
      currentHolderName: deleteField(),
      currentHolderPhone: deleteField(),
      currentTransactionType: deleteField(),
      door: "open", // Mở cửa khi nhận hàng
      lastUpdated: new Date()
    });

    // ✅ Cập nhật receive = true cho delivery_info tương ứng (cho đơn gửi hàng SMS)
    try {
      const deliveryInfoQuery = query(
        collection(db, "delivery_info"),
        where("orderId", "==", transactionId),
        where("deliveryType", "==", "gui")
      )
      const deliveryInfoSnapshot = await getDocs(deliveryInfoQuery)
      
      for (const docSnap of deliveryInfoSnapshot.docs) {
        await updateDeliveryInfo(docSnap.id, { receive: true })
        console.log(`✅ Đã cập nhật receive = true cho delivery_info ${docSnap.id}`)
      }
    } catch (e) {
      console.error("Lỗi cập nhật receive cho delivery_info:", e)
    }

    // ✅ Gửi thông báo cho khách hàng khi nhận hàng thành công
    try {
      const receiverId = transactionData.receiverId || transactionData.senderId;
      if (receiverId) {
        await saveNotification({
          type: "customer_action",
          message: `Bạn đã lấy hàng thành công từ tủ ${lockerNumber}`,
          customerId: receiverId,
          lockerId: lockerId,
          orderId: transactionId,
          isRead: false,
          createdAt: new Date(),
        });
        console.log(`✅ Đã gửi thông báo lấy hàng cho khách hàng: ${receiverId}`);
      }
    } catch (notificationError) {
      console.error("Lỗi gửi thông báo lấy hàng:", notificationError);
    }

    console.log(`✅ Đã xử lý nhận hàng: Transaction ${transactionId}, Locker ${lockerId} đã được reset và mở cửa`);

    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xử lý nhận hàng:", error);
    throw error;
  }
}

// Kiểm tra code và phone từ delivery_info để xác thực nhận hàng
export async function verifyPickupCode(code: string, phone: string): Promise<{ success: boolean; deliveryInfo?: any; transactionId?: string }> {
  try {
    // Chuẩn hóa số điện thoại
    const normalizePhone = (phone: string) => {
      if (!phone) return ""
      let normalized = phone.replace(/\D/g, "")
      if (normalized.startsWith("84")) {
        normalized = "+" + normalized
      } else if (normalized.startsWith("0")) {
        normalized = "+84" + normalized.slice(1)
      } else {
        normalized = "+84" + normalized
      }
      return normalized
    }

    const normalizedPhone = normalizePhone(phone)

    // Tìm delivery_info có accessCode và receiverPhone khớp
    const deliveryInfoQuery = query(
      collection(db, "delivery_info"),
      where("deliveryType", "==", "gui") // Chỉ tìm đơn gửi hàng
    );
    const deliveryInfoSnapshot = await getDocs(deliveryInfoQuery);

    for (const docSnap of deliveryInfoSnapshot.docs) {
      const data = docSnap.data();
      const deliveryPhone = normalizePhone(data.receiverPhone || "");

      // Kiểm tra accessCode (mã lấy hàng trong delivery_info)
      const codeMatch = data.accessCode === code;

      if (codeMatch && deliveryPhone === normalizedPhone) {
        // Lấy transactionId từ orderId trong delivery_info
        const transactionId = data.orderId;

        if (!transactionId) {
          console.warn("⚠️ Delivery_info không có orderId:", docSnap.id)
          continue
        }

        return {
          success: true,
          deliveryInfo: { id: docSnap.id, ...data },
          transactionId
        };
      }
    }

    return { success: false };
  } catch (error) {
    console.error("Lỗi khi kiểm tra mã lấy hàng:", error);
    throw error;
  }
}

// Xử lý nhận hàng từ notification của phần cứng
export async function handlePickupFromNotification(orderId: string, lockerNumber?: string): Promise<{ success: boolean; message?: string }> {
  try {
    // Kiểm tra transaction có tồn tại không
    const transactionRef = doc(db, "transactions", orderId);
    const transactionSnap = await getDoc(transactionRef);

    if (!transactionSnap.exists()) {
      return { success: false, message: "Không tìm thấy giao dịch" };
    }

    const transactionData = transactionSnap.data();
    
    // Kiểm tra trạng thái hiện tại
    if (transactionData.status === "picked_up") {
      console.log(`⚠️ Transaction ${orderId} đã được nhận hàng trước đó`);
      return { success: true, message: "Đơn hàng đã được nhận hàng trước đó" };
    }

    if (transactionData.status !== "delivered") {
      return { success: false, message: `Trạng thái đơn hàng không hợp lệ: ${transactionData.status}` };
    }

    // Gọi hàm pickupPackage để xử lý nhận hàng
    await pickupPackage(orderId);

    console.log(`✅ Đã xử lý nhận hàng từ phần cứng: Transaction ${orderId}, Locker ${lockerNumber || transactionData.lockerId}`);

    return { success: true, message: "Đã cập nhật trạng thái nhận hàng thành công" };
  } catch (error) {
    console.error("Lỗi khi xử lý nhận hàng từ notification:", error);
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
    // Lấy tất cả thông báo chưa đọc
    const q = query(notificationsRef, where("isRead", "==", false))
    const snap = await getDocs(q)

    if (snap.empty) return

    const batch = writeBatch(db)
    let count = 0
    // Chỉ cập nhật thông báo hệ thống (không có customerId và không có privateToCustomer)
    snap.docs.forEach((d) => {
      const data = d.data()
      // Lọc giống như trong NotificationDropdown: !customerId && !privateToCustomer
      if (!data.customerId && !data.privateToCustomer) {
        batch.update(d.ref, { isRead: true })
        count++
      }
    })

    if (count > 0) {
      await batch.commit()
      console.log(`✅ Đã đánh dấu ${count} thông báo hệ thống là đã đọc`)
    } else {
      console.log("ℹ️ Không có thông báo hệ thống nào cần đánh dấu đã đọc")
    }
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
