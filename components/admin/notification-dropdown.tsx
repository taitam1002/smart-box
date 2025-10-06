"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getNotifications } from "@/lib/firestore-actions"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const notificationsQuery = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    )

    let firstLoad = true

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        }
      })
      // Detect newly added notifications after initial load
      if (!firstLoad) {
        const prevIds = new Set(notifications.map((n) => n.id))
        const newOnes = next.filter((n) => !prevIds.has(n.id))
        if (newOnes.length > 0) {
          const newest = newOnes[0]
          toast({
            title: "Thông báo mới",
            description: newest.message,
          })
        }
      }
      firstLoad = false
      setNotifications(next)
    })

    return () => unsubscribe()
  }, [])
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "error":
        return "🔴"
      case "warning":
        return "⚠️"
      case "customer_action":
        return "📦"
      default:
        return "ℹ️"
    }
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative focus:outline-none">
          <Bell className="h-6 w-6 text-gray-600 hover:text-[#2E3192] transition-colors" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-[#E31E24] hover:bg-[#E31E24]">
              {unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-[#2E3192] hover:text-[#2E3192]"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Đánh dấu đã đọc
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Không có thông báo mới</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 border-b hover:bg-gray-50 transition-colors cursor-pointer",
                  !notification.isRead && "bg-blue-50",
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !notification.isRead && "font-semibold")}>{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                  </div>
                  {!notification.isRead && <div className="w-2 h-2 bg-[#2E3192] rounded-full flex-shrink-0 mt-1" />}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
