"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, TrendingUp } from "lucide-react"
import { getLockers, getUsers, getTransactions } from "@/lib/firestore-actions"
import type { Locker, User, Order } from "@/lib/types"

export default function AdminDashboardPage() {
  const [lockers, setLockers] = useState<Locker[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [lockersData, usersData, ordersData] = await Promise.all([
          getLockers(),
          getUsers(),
          getTransactions()
        ])
        
        setLockers(lockersData)
        setUsers(usersData)
        setOrders(ordersData)
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Tổng quan hệ thống</h2>
          <p className="text-muted-foreground mt-1">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  const availableLockers = lockers.filter((l) => l.status === "available").length
  const occupiedLockers = lockers.filter((l) => l.status === "occupied").length
  const totalCustomers = users.filter((u) => u.role === "customer").length
  
  // Tính số giao dịch hôm nay
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() === today.getTime()
  }).length
  
  // Định dạng thời gian cho mục Hoạt động gần đây
  const formatActivityTime = (input: any) => {
    const d = new Date(input)
    const now = new Date()
    const isSameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()

    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    if (isSameDay) return time

    const dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
    return `${time} · ${dateStr}`
  }


  const stats = [
    {
      title: "Tủ khả dụng",
      value: availableLockers,
      total: lockers.length,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Tủ đang sử dụng",
      value: occupiedLockers,
      total: lockers.length,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Khách hàng",
      value: totalCustomers,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Giao dịch hôm nay",
      value: todayOrders,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Tổng quan hệ thống</h2>
        <p className="text-muted-foreground mt-1">Thống kê tổng quan về hệ thống tủ thông minh</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stat.value}
                  {stat.total && <span className="text-lg text-muted-foreground">/{stat.total}</span>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>


      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái tủ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Khả dụng</span>
                <span className="font-bold text-green-600">{availableLockers} tủ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Đang sử dụng</span>
                <span className="font-bold text-blue-600">{occupiedLockers} tủ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bảo trì</span>
                <span className="font-bold text-yellow-600">
                  {lockers.filter((l) => l.status === "maintenance").length} tủ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Lỗi</span>
                <span className="font-bold text-red-600">
                  {lockers.filter((l) => l.status === "error").length} tủ
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#2E3192] mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">{order.senderName}</p>
                    <p className="text-muted-foreground text-xs">
                      {order.status === "delivered" ? "Đã gửi hàng" : "Đã lấy hàng"} - Tủ{" "}
                      {lockers.find((l) => l.id === order.lockerId)?.lockerNumber}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatActivityTime(order.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
