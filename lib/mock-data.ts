import type { User, Locker, Order, Notification, ErrorReport } from "./types"

// Mock admin account
export const ADMIN_ACCOUNT = {
  email: "admin@hcmute.edu.vn",
  password: "admin123",
}

// Mock users data
export const mockUsers: User[] = [
  {
    id: "admin-1",
    email: "admin@hcmute.edu.vn",
    password: "admin123",
    name: "Admin HCMUTE",
    phone: "0123456789",
    role: "admin",
    isActive: true,
    createdAt: new Date("2025-01-01"),
  },
  {
    id: "user-1",
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
    id: "user-2",
    email: "tran.thi.b@student.hcmute.edu.vn",
    password: "user123",
    name: "Trần Thị B",
    phone: "0912345678",
    role: "customer",
    customerType: "regular",
    isActive: true,
    createdAt: new Date("2025-01-20"),
  },
]

// Mock lockers data
export const mockLockers: Locker[] = Array.from({ length: 24 }, (_, i) => ({
  id: `locker-${i + 1}`,
  lockerNumber: `A${String(i + 1).padStart(2, "0")}`,
  status: i < 5 ? "occupied" : i < 20 ? "available" : i < 22 ? "maintenance" : "error",
  size: i % 3 === 0 ? "large" : i % 2 === 0 ? "medium" : "small",
  currentOrderId: i < 5 ? `order-${i + 1}` : undefined,
  lastUpdated: new Date(),
}))

// Mock orders data
export const mockOrders: Order[] = [
  {
    id: "order-1",
    senderId: "user-1",
    senderName: "Nguyễn Văn A",
    senderPhone: "0987654321",
    senderType: "shipper",
    receiverName: "Lê Văn C",
    receiverPhone: "0901234567",
    orderCode: "DH001234",
    lockerId: "locker-1",
    status: "delivered",
    createdAt: new Date("2025-02-01T10:00:00"),
    deliveredAt: new Date("2025-02-01T10:05:00"),
  },
  {
    id: "order-2",
    senderId: "user-2",
    senderName: "Trần Thị B",
    senderPhone: "0912345678",
    senderType: "regular",
    receiverName: "Phạm Thị D",
    receiverPhone: "0908765432",
    lockerId: "locker-2",
    status: "picked_up",
    createdAt: new Date("2025-02-01T11:00:00"),
    deliveredAt: new Date("2025-02-01T11:05:00"),
    pickedUpAt: new Date("2025-02-01T14:30:00"),
  },
]

// Mock notifications data
export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "error",
    message: "Tủ A23 gặp lỗi cảm biến cửa",
    lockerId: "locker-23",
    isRead: false,
    createdAt: new Date("2025-02-02T09:00:00"),
  },
  {
    id: "notif-2",
    type: "warning",
    message: "Tủ A24 cần bảo trì định kỳ",
    lockerId: "locker-24",
    isRead: false,
    createdAt: new Date("2025-02-02T08:00:00"),
  },
  {
    id: "notif-3",
    type: "customer_action",
    message: "Nguyễn Văn A đã gửi hàng vào tủ A01",
    lockerId: "locker-1",
    customerId: "user-1",
    orderId: "order-1",
    isRead: false,
    createdAt: new Date("2025-02-02T10:00:00"),
  },
  {
    id: "notif-4",
    type: "customer_action",
    message: "Trần Thị B đã giữ hàng tại tủ A05",
    lockerId: "locker-5",
    customerId: "user-2",
    isRead: true,
    createdAt: new Date("2025-02-01T15:30:00"),
  },
  {
    id: "notif-5",
    type: "error",
    message: "Khách hàng Nguyễn Văn A báo lỗi: Tủ không mở được",
    customerId: "user-1",
    lockerId: "locker-3",
    isRead: false,
    createdAt: new Date("2025-02-02T11:00:00"),
  },
]

// Mock error reports data
export const mockErrorReports: ErrorReport[] = [
  {
    id: "error-1",
    customerId: "user-1",
    customerName: "Nguyễn Văn A",
    lockerId: "locker-3",
    description: "Tủ không mở được sau khi nhập vân tay",
    status: "pending",
    processingStage: "reported",
    createdAt: new Date("2025-02-02T11:00:00"),
  },
  {
    id: "error-2",
    customerId: "user-2",
    customerName: "Trần Thị B",
    lockerId: "locker-7",
    description: "Màn hình cảm ứng không hoạt động",
    status: "resolved",
    processingStage: "notified",
    createdAt: new Date("2025-02-01T09:00:00"),
    resolvedAt: new Date("2025-02-01T16:00:00"),
  },
]
