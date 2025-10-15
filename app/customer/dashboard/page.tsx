"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"
import { getUserTransactions, getLockers, getNotifications } from "@/lib/firestore-actions"
import { Package, Send, Clock, CheckCircle, Edit3, Bell, X } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore"

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    if (!currentUser) return
    
    const load = async () => {
      try {
        const [txs, lockerList] = await Promise.all([
          getUserTransactions(currentUser.id),
          getLockers()
        ])
        setOrders(txs)
        setLockers(lockerList)
      } catch (e) {
        // ignore
      }
    }
    load()

    // Lắng nghe thông báo realtime cho khách hàng này
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("customerId", "==", currentUser.id),
      orderBy("createdAt", "desc")
    )

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
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

    return () => unsubscribe()
  }, [])

  const userOrders = orders
  const activeOrders = userOrders.filter((o) => o.status === "delivered")
  const completedOrders = userOrders.filter((o) => o.status === "picked_up")
  const unreadNotifications = notifications.filter(n => !n.isRead)

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-[#2E3192] to-[#4A5AB8] text-white border-0">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-bold mb-2">Xin chào, {user?.name}!</h2>
          <p className="text-white/80 mb-4">
            Bạn đang sử dụng tài khoản với vai trò là {" "}
            <span className="font-semibold">{user?.customerType === "shipper" ? "Shipper" : "Người gửi"}</span>
          </p>
          <Button onClick={() => router.push("/customer/send")} className="bg-[#E31E24] hover:bg-[#C01A1F] text-white">
            <Send className="h-4 w-4 mr-2" />
            Gửi hàng mới
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      {unreadNotifications.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Bell className="h-5 w-5" />
              Thông báo mới
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unreadNotifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                  <div className="flex-1">
                    <p className="text-sm text-green-800 font-medium">{notification.message}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {new Date(notification.createdAt).toLocaleString("vi-VN")}
                    </p>
                    {notification.errorId && (
                      <p className="text-xs text-green-600 mt-1">
                        Mã lỗi: {notification.errorId}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="text-green-600 hover:text-green-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Đơn đang gửi</CardTitle>
            <Clock className="h-5 w-5 text-blue-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">{activeOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Đã hoàn thành</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">{completedOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Tổng đơn hàng</CardTitle>
            <Package className="h-5 w-5 text-purple-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-800">{userOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {userOrders.length > 0 ? (
            <div className="space-y-4">
              {userOrders.slice(0, 5).map((order) => {
                const locker = lockers.find((l) => l.id === order.lockerId)
                const isPickedUp = order.status === "picked_up"
                return (
                  <div key={order.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                    isPickedUp 
                      ? "bg-green-50 border-green-500" 
                      : "bg-blue-50 border-blue-500"
                  }`}>
                    <div className="flex-1">
                      <div className="mb-1">
                        <p className="font-medium">Người nhận: {order.receiverName}</p>
                        {order.orderCode && (
                          <p className="text-sm text-[#2E3192] font-semibold mt-1 ">
                            Mã đơn: {order.orderCode}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tủ: {locker?.lockerNumber} • {order.receiverPhone}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="text-right">
                      {order.status === "delivered" && (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                          <Clock className="h-4 w-4" />
                          Chờ lấy hàng
                        </span>
                      )}
                      {order.status === "picked_up" && (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          Đã lấy hàng
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Bạn chưa có đơn hàng nào</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
