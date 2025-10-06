"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, TrendingUp, AlertCircle } from "lucide-react"
import { mockLockers, mockUsers, mockOrders, mockNotifications } from "@/lib/mock-data"

export default function AdminDashboardPage() {
  const availableLockers = mockLockers.filter((l) => l.status === "available").length
  const occupiedLockers = mockLockers.filter((l) => l.status === "occupied").length
  const totalCustomers = mockUsers.filter((u) => u.role === "customer").length
  const todayOrders = mockOrders.length
  const unreadNotifications = mockNotifications.filter((n) => !n.isRead).length

  const stats = [
    {
      title: "Tủ khả dụng",
      value: availableLockers,
      total: mockLockers.length,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Tủ đang sử dụng",
      value: occupiedLockers,
      total: mockLockers.length,
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

      {/* Notifications Alert */}
      {unreadNotifications > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Thông báo cần xử lý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              Bạn có <span className="font-bold">{unreadNotifications}</span> thông báo chưa đọc. Vui lòng kiểm tra mục
              Thông báo.
            </p>
          </CardContent>
        </Card>
      )}

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
                  {mockLockers.filter((l) => l.status === "maintenance").length} tủ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Lỗi</span>
                <span className="font-bold text-red-600">
                  {mockLockers.filter((l) => l.status === "error").length} tủ
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
              {mockOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#2E3192] mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">{order.senderName}</p>
                    <p className="text-muted-foreground text-xs">
                      {order.status === "delivered" ? "Đã gửi hàng" : "Đã lấy hàng"} - Tủ{" "}
                      {mockLockers.find((l) => l.id === order.lockerId)?.lockerNumber}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
