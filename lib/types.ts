export type UserRole = "admin" | "customer"
export type CustomerType = "shipper" | "regular"
export type LockerStatus = "available" | "occupied" | "maintenance" | "error"
export type DoorStatus = "closed" | "open"
export type OrderStatus = "pending" | "delivered" | "picked_up" | "expired"
export type ErrorStatus = "pending" | "received" | "processing" | "resolved" | "closed"
export type ErrorProcessingStage = "reported" | "received" | "processing" | "resolved" | "notified"

export interface User {
  id: string
  email: string
  password: string
  name: string
  phone: string
  role: UserRole
  customerType?: CustomerType
  isActive: boolean
  createdAt: Date
  lastLoginAt?: Date
  lastAccessAt?: Date
}

export interface Locker {
  id: string
  lockerNumber: string
  status: LockerStatus
  size: "small" | "medium" | "large"
  currentOrderId?: string
  door?: DoorStatus // Trạng thái cửa tủ: "closed" hoặc "open"
  lastUpdated: Date
}

export interface Order {
  id: string
  senderId: string
  senderName: string
  senderPhone: string
  senderType: CustomerType
  receiverName: string
  receiverPhone: string
  orderCode?: string
  lockerId: string
  status: OrderStatus
  createdAt: Date
  deliveredAt?: Date
  pickedUpAt?: Date
  pickupCode?: string
  transactionType?: "send" | "hold"
  fingerprintVerified?: boolean
  smsSent?: boolean
}

export interface Notification {
  id: string
  type: "error" | "warning" | "info" | "customer_action" | "pickup"
  message: string
  lockerId?: string
  orderId?: string
  customerId?: string
  errorId?: string
  isRead: boolean
  createdAt: Date
}

export interface ErrorReport {
  id: string
  customerId: string
  customerName: string
  lockerId?: string
  description: string
  status: ErrorStatus
  processingStage: ErrorProcessingStage
  createdAt: Date
  receivedAt?: Date
  processingStartedAt?: Date
  resolvedAt?: Date
  closedAt?: Date
  adminNotes?: string
  customerNotifiedAt?: Date
}

export interface DeliveryInfo {
  id: string
  receiverPhone: string // Số điện thoại đã format +84
  receiverName: string
  lockerSize: "small" | "medium" | "large"
  lockerNumber: string
  lockerId: string
  senderId: string
  orderId?: string // ID của transaction nếu có
  accessCode?: string // Mã lấy hàng (cho đơn gửi hàng)
  fingerprintVerified?: boolean // Trạng thái xác thực vân tay
  smsSent?: boolean // Trạng thái đã gửi SMS
  deliveryType: "gui" | "giu" // "gui" = gửi hàng, "giu" = giữ hàng (required)
  createdAt: Date
}
