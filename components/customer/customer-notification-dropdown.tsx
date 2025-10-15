"use client"

import { useEffect, useState } from "react"
import { Bell, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { findUserByEmail } from "@/lib/firestore-actions"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export function CustomerNotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
    if (!currentUser) return

    const init = async () => {
      const currentUser = getCurrentUser()
      setUser(currentUser)
      if (!currentUser) return () => {}

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
          const map = new Map<string, any>()
          ;[...all, ...items].forEach((n) => map.set(n.id, n))
          const merged = Array.from(map.values()).sort((a: any, b: any) => {
            const ta = a?.createdAt?.getTime?.() ?? 0
            const tb = b?.createdAt?.getTime?.() ?? 0
            return tb - ta
          })
          setNotifications(merged)
        })
        unsubscribers.push(unsub)
      })

      return () => unsubscribers.forEach((fn) => fn())
    }

    let cleanup: any
    init().then((fn) => (cleanup = fn))
    return () => cleanup?.()
  }, [])
  
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const recentNotifications = notifications.slice(0, 5) // Chỉ hiển thị 5 thông báo gần nhất

  const handleViewAllNotifications = () => {
    router.push('/customer/notifications')
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
          <Bell className="h-6 w-6 text-white" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Thông báo của bạn</h3>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
