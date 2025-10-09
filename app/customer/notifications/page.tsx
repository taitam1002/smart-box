"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { Bell, Package, AlertCircle, Info, CheckCircle, Clock, X, Check } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { findUserByEmail, markNotificationAsRead } from "@/lib/firestore-actions"
import { toast } from "@/hooks/use-toast"

const notificationIcons = {
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
  customer_action: Package,
}

const notificationColors = {
  error: "text-red-600 bg-red-50 border-red-200",
  warning: "text-orange-600 bg-orange-50 border-orange-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
  customer_action: "text-green-600 bg-green-50 border-green-200",
}

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const currentUser = getCurrentUser()
      setUser(currentUser)

      if (!currentUser) {
        setLoading(false)
        return
      }

      const candidateIds = new Set<string>([currentUser.id])
      try {
        if (currentUser.email) {
          const profile = await findUserByEmail(currentUser.email)
          if (profile?.id) candidateIds.add(profile.id)
        }
      } catch {}

      const unsubscribers: Array<() => void> = []
      const all: any[] = []
      candidateIds.forEach((cid) => {
        const qRef = query(collection(db, "notifications"), where("customerId", "==", cid))
        const unsub = onSnapshot(qRef, (snapshot) => {
          const items = snapshot.docs.map((docSnap) => {
            const data: any = docSnap.data()
            return {
              id: docSnap.id,
              ...data,
              createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            }
          })
          // merge results from multiple listeners
          const map = new Map<string, any>()
          ;[...all, ...items].forEach((n) => map.set(n.id, n))
          const merged = Array.from(map.values()).sort((a: any, b: any) => {
            const ta = a?.createdAt?.getTime?.() ?? 0
            const tb = b?.createdAt?.getTime?.() ?? 0
            return tb - ta
          })
          setNotifications(merged)
          setLoading(false)
        })
        unsubscribers.push(unsub)
      })

      return () => unsubscribers.forEach((fn) => fn())
    }

    const cleanupPromise = init()
    return () => { (cleanupPromise as any)?.then?.((fn: any) => fn?.()) }
  }, [])

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    toast({
      title: "Đã đóng thông báo",
      description: "Thông báo đã được ẩn khỏi danh sách",
    })
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes} phút trước`
    if (hours < 24) return `${hours} giờ trước`
    return `${days} ngày trước`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Thông báo</h2>
          <p className="text-muted-foreground mt-1">Đang tải thông báo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Thông báo của bạn</h2>
        <p className="text-muted-foreground mt-1">Theo dõi các thông báo về đơn hàng và báo lỗi</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Bạn chưa có thông báo nào</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info
            const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.info

            return (
              <Card 
                key={notification.id} 
                className={`border-2 ${colorClass} ${!notification.isRead ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={async () => {
                  if (!notification.isRead) {
                    await markNotificationAsRead(notification.id)
                    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
                  }
                }}
              >
                <CardContent className="pt-6">
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
                                ? "Báo lỗi"
                                : notification.type === "warning"
                                  ? "Cảnh báo"
                                  : notification.type === "customer_action"
                                    ? "Đơn hàng"
                                    : "Thông tin"}
                            </span>
                            {!notification.isRead && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#E31E24] text-white">
                                Mới
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-lg">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!notification.isRead && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                await markNotificationAsRead(notification.id)
                                setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
                                toast({
                                  title: "Thành công",
                                  description: "Đã đánh dấu thông báo là đã đọc",
                                })
                              }}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Đánh dấu đã đọc
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              dismissNotification(notification.id)
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
