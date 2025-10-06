"use client"

import { useEffect, useState } from "react"
import { getNotifications, getLockers, markNotificationAsRead } from "@/lib/firestore-actions"
import { AlertCircle, AlertTriangle, Info, Check, Package } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"

const notificationIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  customer_action: Package,
}

const notificationColors = {
  error: "text-red-600 bg-red-50 border-red-200",
  warning: "text-orange-600 bg-orange-50 border-orange-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
  customer_action: "text-green-600 bg-green-50 border-green-200",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])

  useEffect(() => {
    // realtime notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    )

    const unsubscribeNotifs = onSnapshot(notificationsQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        }
      })
      setNotifications(next)
    })

    // lockers can stay as one-time load
    const loadLockers = async () => {
      try {
        const lockerList = await getLockers()
        setLockers(lockerList)
      } catch (e) {
        console.error("Lỗi tải tủ:", e)
      }
    }
    loadLockers()

    return () => {
      unsubscribeNotifs()
    }
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch (e) {
      console.error("Lỗi đánh dấu đã đọc:", e)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Thông báo</h2>
        <p className="text-muted-foreground mt-1">Theo dõi các thông báo và cảnh báo từ hệ thống</p>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => {
          const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info
          const colorClass =
            notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.info
          const locker = notification.lockerId ? lockers.find((l) => l.id === notification.lockerId) : null

          return (
            <div key={notification.id} className={`border-2 rounded-lg ${colorClass}`}>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border border-gray-300 bg-white capitalize">
                            {notification.type === "error"
                              ? "Lỗi"
                              : notification.type === "warning"
                                ? "Cảnh báo"
                                : notification.type === "customer_action"
                                  ? "Hoạt động khách hàng"
                                  : "Thông tin"}
                          </span>
                          {!notification.isRead && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#E31E24] text-white">
                              Mới
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-lg">{notification.message}</p>
                        {locker && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Tủ số: {locker.lockerNumber} - Kích thước:{" "}
                            {locker.size === "small" ? "Nhỏ" : locker.size === "medium" ? "Vừa" : "Lớn"}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <button onClick={() => handleMarkRead(notification.id)} className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
                            <Check className="h-4 w-4 mr-1" />
                            Đánh dấu đã đọc
                          </button>
                        )}
                        {notification.type === "error" && (
                          <button className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-[#E31E24] text-white hover:bg-[#C01A1F] transition-colors">
                            Xử lý ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

