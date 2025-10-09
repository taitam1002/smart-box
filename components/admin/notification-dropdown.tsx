"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getNotifications, markNotificationAsRead } from "@/lib/firestore-actions"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([])
  const router = useRouter()

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
      // Lọc chỉ thông báo hệ thống (không có customerId) và KHÔNG có cờ privateToCustomer
      const systemNotifications = next.filter(notification => !notification.customerId && !notification.privateToCustomer)
      
      // Detect newly added notifications after initial load
      if (!firstLoad) {
        const prevIds = new Set(notifications.map((n) => n.id))
        const newOnes = systemNotifications.filter((n) => !prevIds.has(n.id))
        if (newOnes.length > 0) {
          const newest = newOnes[0]
          toast({
            title: "Thông báo mới",
            description: newest.message,
          })
        }
      }
      firstLoad = false
      setNotifications(systemNotifications)
    })

    return () => unsubscribe()
  }, [])
  
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const recentNotifications = notifications.slice(0, 5) // Chỉ hiển thị 5 thông báo gần nhất

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead)
      const promises = unreadNotifications.map(notification => 
        markNotificationAsRead(notification.id)
      )
      await Promise.all(promises)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast({
        title: "Thành công",
        description: "Đã đánh dấu tất cả thông báo là đã đọc",
      })
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", error)
      toast({
        title: "Lỗi",
        description: "Không thể đánh dấu tất cả thông báo",
        variant: "destructive",
      })
    }
  }

  const handleViewAllNotifications = () => {
    router.push('/admin/notifications')
  }

  const handleNotificationClick = async (notification: any) => {
    // Đánh dấu đã đọc nếu chưa đọc
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
    // Chuyển đến trang thông báo
    router.push('/admin/notifications')
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
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Không có thông báo mới</div>
          ) : (
            recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 border-b hover:bg-gray-50 transition-colors cursor-pointer",
                  !notification.isRead && "bg-blue-50",
                )}
                onClick={() => handleNotificationClick(notification)}
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
        
        {/* Footer với nút xem tất cả */}
        {notifications.length > 5 && (
          <div className="p-4 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAllNotifications}
              className="w-full text-[#2E3192] hover:text-[#2E3192] hover:bg-white"
            >
              Xem tất cả thông báo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
