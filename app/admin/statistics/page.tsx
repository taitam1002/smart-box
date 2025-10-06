"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockOrders } from "@/lib/mock-data"
import { BarChart3, TrendingUp, Package, Clock } from "lucide-react"

export default function StatisticsPage() {
  const totalUsage = mockOrders.length
  const todayUsage = mockOrders.filter((o) => {
    const today = new Date()
    const orderDate = new Date(o.createdAt)
    return orderDate.toDateString() === today.toDateString()
  }).length

  const averageUsagePerDay = 12
  const mostUsedLocker = "A01"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Báo cáo thống kê</h2>
        <p className="text-muted-foreground mt-1">Thống kê chi tiết về việc sử dụng hệ thống tủ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng lượt sử dụng</CardTitle>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground mt-1">Tất cả thời gian</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sử dụng hôm nay</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayUsage}</div>
            <p className="text-xs text-muted-foreground mt-1">+20% so với hôm qua</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TB mỗi ngày</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageUsagePerDay}</div>
            <p className="text-xs text-muted-foreground mt-1">7 ngày qua</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tủ phổ biến nhất</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mostUsedLocker}</div>
            <p className="text-xs text-muted-foreground mt-1">45 lượt sử dụng</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Locker Size */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê theo kích thước tủ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tủ nhỏ</span>
              <div className="flex items-center gap-4">
                <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: "60%" }} />
                </div>
                <span className="text-sm font-medium w-12 text-right">60%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tủ vừa</span>
              <div className="flex items-center gap-4">
                <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: "75%" }} />
                </div>
                <span className="text-sm font-medium w-12 text-right">75%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tủ lớn</span>
              <div className="flex items-center gap-4">
                <div className="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: "45%" }} />
                </div>
                <span className="text-sm font-medium w-12 text-right">45%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage by User Type */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê theo loại người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Shipper</span>
                <span className="text-2xl font-bold text-blue-600">65%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: "65%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Người gửi thường</span>
                <span className="text-2xl font-bold text-green-600">35%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: "35%" }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
