import { db, auth } from "./firebase";
import { collection, addDoc, doc, setDoc, getDocs, query, where, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import type { User, Locker, Order, Notification, ErrorReport } from "./types";

// Hàm khởi tạo dữ liệu mẫu
export async function seedFirestoreData() {
  try {
    console.log("Bắt đầu khởi tạo dữ liệu mẫu...");

    // 1. Tạo tài khoản admin
    const adminUser: Omit<User, "id"> = {
      email: "admin@hcmute.edu.vn",
      password: "admin123",
      name: "Admin HCMUTE",
      phone: "0123456789",
      role: "admin",
      isActive: true,
      createdAt: new Date("2025-01-01"),
    };
    
    const adminRef = await addDoc(collection(db, "users"), adminUser);
    console.log("✅ Đã tạo tài khoản admin:", adminRef.id);

    // 2. Tạo tài khoản khách hàng mẫu
    const sampleUsers: Omit<User, "id">[] = [
      {
        email: "nguyen.van.a@student.hcmute.edu.vn",
        password: "user123",
        name: "Nguyễn Văn A",
        phone: "0987654321",
        role: "customer",
        customerType: "shipper",
        isActive: true,
        createdAt: new Date("2025-01-15"),
      },
      {
        email: "tran.thi.b@student.hcmute.edu.vn",
        password: "user123",
        name: "Trần Thị B",
        phone: "0912345678",
        role: "customer",
        customerType: "regular",
        isActive: true,
        createdAt: new Date("2025-01-20"),
      },
    ];

    const userIds: string[] = [];
    for (const user of sampleUsers) {
      const userRef = await addDoc(collection(db, "users"), user);
      userIds.push(userRef.id);
      console.log("✅ Đã tạo tài khoản khách hàng:", userRef.id);
    }

    // 3. Tạo tủ thông minh
    const lockers: Omit<Locker, "id">[] = Array.from({ length: 24 }, (_, i) => ({
      lockerNumber: `A${String(i + 1).padStart(2, "0")}`,
      status: i < 5 ? "occupied" : i < 20 ? "available" : i < 22 ? "maintenance" : "error",
      size: i % 3 === 0 ? "large" : i % 2 === 0 ? "medium" : "small",
      currentOrderId: i < 5 ? `order-${i + 1}` : undefined,
      lastUpdated: new Date(),
    }));

    const lockerIds: string[] = [];
    for (const locker of lockers) {
      const lockerRef = await addDoc(collection(db, "lockers"), locker);
      lockerIds.push(lockerRef.id);
    }
    console.log("✅ Đã tạo 24 tủ thông minh");

    // 4. Tạo giao dịch mẫu
    const sampleOrders: Omit<Order, "id">[] = [
      {
        senderId: userIds[0],
        senderName: "Nguyễn Văn A",
        senderPhone: "0987654321",
        senderType: "shipper",
        receiverName: "Lê Văn C",
        receiverPhone: "0901234567",
        orderCode: "DH001234",
        lockerId: lockerIds[0],
        status: "delivered",
        createdAt: new Date("2025-02-01T10:00:00"),
        deliveredAt: new Date("2025-02-01T10:05:00"),
      },
      {
        senderId: userIds[1],
        senderName: "Trần Thị B",
        senderPhone: "0912345678",
        senderType: "regular",
        receiverName: "Phạm Thị D",
        receiverPhone: "0908765432",
        lockerId: lockerIds[1],
        status: "picked_up",
        createdAt: new Date("2025-02-01T11:00:00"),
        deliveredAt: new Date("2025-02-01T11:05:00"),
        pickedUpAt: new Date("2025-02-01T14:30:00"),
      },
    ];

    for (const order of sampleOrders) {
      await addDoc(collection(db, "transactions"), order);
    }
    console.log("✅ Đã tạo giao dịch mẫu");

    // 5. Tạo thông báo mẫu
    const sampleNotifications: Omit<Notification, "id">[] = [
      {
        type: "error",
        message: "Tủ A23 gặp lỗi cảm biến cửa",
        lockerId: lockerIds[22],
        isRead: false,
        createdAt: new Date("2025-02-02T09:00:00"),
      },
      {
        type: "warning",
        message: "Tủ A24 cần bảo trì định kỳ",
        lockerId: lockerIds[23],
        isRead: false,
        createdAt: new Date("2025-02-02T08:00:00"),
      },
      {
        type: "customer_action",
        message: "Nguyễn Văn A đã gửi hàng vào tủ A01",
        lockerId: lockerIds[0],
        customerId: userIds[0],
        orderId: "order-1",
        isRead: false,
        createdAt: new Date("2025-02-02T10:00:00"),
      },
    ];

    for (const notification of sampleNotifications) {
      await addDoc(collection(db, "notifications"), notification);
    }
    console.log("✅ Đã tạo thông báo mẫu");

    // 6. Tạo báo lỗi mẫu
    const sampleErrorReports: Omit<ErrorReport, "id">[] = [
      {
        customerId: userIds[0],
        customerName: "Nguyễn Văn A",
        lockerId: lockerIds[2],
        description: "Tủ không mở được sau khi nhập vân tay",
        status: "pending",
        createdAt: new Date("2025-02-02T11:00:00"),
      },
      {
        customerId: userIds[1],
        customerName: "Trần Thị B",
        lockerId: lockerIds[6],
        description: "Màn hình cảm ứng không hoạt động",
        status: "resolved",
        createdAt: new Date("2025-02-01T09:00:00"),
        resolvedAt: new Date("2025-02-01T16:00:00"),
      },
    ];

    for (const errorReport of sampleErrorReports) {
      await addDoc(collection(db, "errors"), errorReport);
    }
    console.log("✅ Đã tạo báo lỗi mẫu");

    console.log("🎉 Hoàn thành khởi tạo dữ liệu mẫu!");
    return true;
  } catch (error) {
    console.error("❌ Lỗi khi khởi tạo dữ liệu:", error);
    return false;
  }
}

// Hàm kiểm tra xem dữ liệu đã tồn tại chưa
export async function checkDataExists(): Promise<boolean> {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    return !usersSnapshot.empty;
  } catch (error) {
    console.error("Lỗi kiểm tra dữ liệu:", error);
    return false;
  }
}

// Đảm bảo có tài khoản admin mặc định
export async function ensureDefaultAdmin(): Promise<{ created: boolean; id?: string }> {
  try {
    const defaultEmail = "admin@hcmute.edu.vn";
    const defaultPassword = "admin123";
    // Idempotency flag in Firestore to avoid duplicate seeding on multiple mounts
    const seedFlagRef = doc(db, "_meta", "seed_status");
    const seedSnap = await getDoc(seedFlagRef);
    if (seedSnap.exists() && seedSnap.data()?.adminSeeded) {
      return { created: false, id: seedSnap.data()?.adminUid };
    }

    // Check Auth first
    const methods = await fetchSignInMethodsForEmail(auth, defaultEmail).catch(() => [])
    let uid: string | undefined
    if (!methods || methods.length === 0) {
      const cred = await createUserWithEmailAndPassword(auth, defaultEmail, defaultPassword)
      uid = cred.user.uid
    }

    // Ensure profile document in Firestore (use uid if available)
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", defaultEmail));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const existingId = snapshot.docs[0].id
      // set flag so it won't run again
      await setDoc(seedFlagRef, { adminSeeded: true, adminUid: existingId }, { merge: true })
      return { created: !!uid, id: existingId };
    }

    const profile = {
      email: defaultEmail,
      name: "Admin HCMUTE",
      phone: "0123456789",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
    } as Omit<User, "id" | "password">;

    let finalId: string
    if (uid) {
      await setDoc(doc(db, "users", uid), profile)
      finalId = uid
    } else {
      const docRef = await addDoc(usersRef, { ...profile, password: defaultPassword } as any)
      finalId = docRef.id
    }
    await setDoc(seedFlagRef, { adminSeeded: true, adminUid: finalId }, { merge: true })
    return { created: true, id: finalId };
  } catch (error) {
    console.error("Lỗi đảm bảo admin mặc định:", error);
    return { created: false };
  }
}

// Tạo 6 tủ mẫu (A01-A06) nếu chưa có tủ nào
export async function seedSixLockers(): Promise<{ created: number }> {
  try {
    const lockersSnap = await getDocs(collection(db, "lockers"));
    // Xóa toàn bộ tủ hiện có trước khi seed để đảm bảo đúng 6 tủ A1-A6
    if (!lockersSnap.empty) {
      for (const d of lockersSnap.docs) {
        await setDoc(doc(db, "_trash", `lockers_${d.id}`), d.data()).catch(() => {})
        await import("firebase/firestore").then(({ deleteDoc }) => deleteDoc(doc(db, "lockers", d.id))).catch(() => {})
      }
    }

    const baseNow = new Date();
    const lockers: Omit<Locker, "id">[] = [
      { lockerNumber: "A1", status: "available", size: "small", lastUpdated: baseNow },
      { lockerNumber: "A2", status: "available", size: "medium", lastUpdated: baseNow },
      { lockerNumber: "A3", status: "available", size: "large", lastUpdated: baseNow },
      { lockerNumber: "A4", status: "available", size: "small", lastUpdated: baseNow },
      { lockerNumber: "A5", status: "available", size: "medium", lastUpdated: baseNow },
      { lockerNumber: "A6", status: "available", size: "large", lastUpdated: baseNow },
    ];

    let created = 0;
    for (const locker of lockers) {
      // Lưu với id cố định theo số tủ (A1..A6)
      await setDoc(doc(db, "lockers", locker.lockerNumber.toUpperCase()), locker);
      created += 1;
    }
    return { created };
  } catch (error) {
    console.error("Lỗi tạo 6 tủ mẫu:", error);
    return { created: 0 };
  }
}

// Đảm bảo có 6 tủ mặc định (A01-A06)
export async function ensureDefaultLockers(): Promise<void> {
  try {
    await seedSixLockers()
  } catch (e) {
    // ignore
  }
}
