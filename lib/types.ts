export type UserRole = "admin" | "customer"
export type CustomerType = "shipper" | "regular"
export type LockerStatus = "available" | "occupied" | "maintenance" | "error"
export type OrderStatus = "pending" | "delivered" | "picked_up" | "expired"

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
}

export interface Locker {
  id: string
  lockerNumber: string
  status: LockerStatus
  size: "small" | "medium" | "large"
  currentOrderId?: string
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
}

export interface Notification {
  id: string
  type: "error" | "warning" | "info" | "customer_action"
  message: string
  lockerId?: string
  orderId?: string
  customerId?: string
  isRead: boolean
  createdAt: Date
}

export interface ErrorReport {
  id: string
  customerId: string
  customerName: string
  lockerId?: string
  description: string
  status: "pending" | "resolved"
  createdAt: Date
  resolvedAt?: Date
}
