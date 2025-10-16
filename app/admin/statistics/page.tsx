"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTransactions, getLockers, getErrorReports } from "@/lib/firestore-actions"
import { BarChart3, TrendingUp, Package, Clock, AlertTriangle } from "lucide-react"
import type { Order, Locker, ErrorReport } from "@/lib/types"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts"

export default function StatisticsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [lockers, setLockers] = useState<Locker[]>([])
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, lockersData, errorsData] = await Promise.all([
          getTransactions(),
          getLockers(),
          getErrorReports(),
        ])
        setOrders(ordersData)
        setLockers(lockersData)
        // Chuẩn hoá createdAt của báo lỗi về Date để tính toán an toàn
        const normalizedErrors = errorsData.map((e: any) => ({
          ...e,
          createdAt: e?.createdAt?.toDate ? e.createdAt.toDate() : e.createdAt,
        })) as ErrorReport[]
        setErrors(normalizedErrors)
      } catch (error) {
        console.error("Lỗi tải dữ liệu thống kê:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Dữ liệu: giao dịch theo ngày (7 ngày gần nhất)
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - idx))
    return d
  })
  const ordersByDay = days.map((d) => {
    const count = orders.filter((o) => {
      const od = new Date(o.createdAt)
      od.setHours(0, 0, 0, 0)
      return od.getTime() === d.getTime()
    }).length
    return {
      day: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`,
      count,
    }
  })

  // Dữ liệu: số lượt sử dụng theo tủ (top 8)
  const lockerIdToCount = new Map<string, number>()
  orders.forEach((o) => {
    lockerIdToCount.set(o.lockerId, (lockerIdToCount.get(o.lockerId) || 0) + 1)
  })
  const lockerUsageData = lockers
    .map((l) => ({ locker: l.lockerNumber, count: lockerIdToCount.get(l.id) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Báo cáo thống kê</h2>
          <p className="text-muted-foreground mt-1">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  const totalUsage = orders.length
  
  // Tính số giao dịch hôm nay
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayUsage = orders.filter((o) => {
    const orderDate = new Date(o.createdAt)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() === today.getTime()
  }).length

  // Tính số giao dịch hôm qua để so sánh
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const yesterdayUsage = orders.filter((o) => {
    const orderDate = new Date(o.createdAt)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() === yesterday.getTime()
  }).length

  const usageChange = yesterdayUsage > 0 ? ((todayUsage - yesterdayUsage) / yesterdayUsage * 100).toFixed(0) : "0"

  // Tính trung bình sử dụng trong 7 ngày qua
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const last7DaysOrders = orders.filter((o) => {
    const orderDate = new Date(o.createdAt)
    return orderDate >= sevenDaysAgo
  })
  const averageUsagePerDay = Math.round(last7DaysOrders.length / 7)

  // Số lượng báo lỗi trong 30 ngày qua
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const errorsLast30Days = errors.filter((er) => {
    const d = new Date((er as any).createdAt)
    return d >= thirtyDaysAgo
  }).length

  // Tìm tủ được sử dụng nhiều nhất
  const lockerUsageCount = new Map<string, number>()
  orders.forEach(order => {
    const count = lockerUsageCount.get(order.lockerId) || 0
    lockerUsageCount.set(order.lockerId, count + 1)
  })
  
  let mostUsedLocker = "N/A"
  let maxUsage = 0
  lockerUsageCount.forEach((count, lockerId) => {
    if (count > maxUsage) {
      maxUsage = count
      const locker = lockers.find(l => l.id === lockerId)
      mostUsedLocker = locker?.lockerNumber || lockerId
    }
  })

  // Thống kê theo kích thước tủ
  const smallLockers = lockers.filter(l => l.size === "small").length
  const mediumLockers = lockers.filter(l => l.size === "medium").length
  const largeLockers = lockers.filter(l => l.size === "large").length
  
  const smallUsage = orders.filter(o => {
    const locker = lockers.find(l => l.id === o.lockerId)
    return locker?.size === "small"
  }).length
  
  const mediumUsage = orders.filter(o => {
    const locker = lockers.find(l => l.id === o.lockerId)
    return locker?.size === "medium"
  }).length
  
  const largeUsage = orders.filter(o => {
    const locker = lockers.find(l => l.id === o.lockerId)
    return locker?.size === "large"
  }).length

  const smallPercentage = smallLockers > 0 ? Math.round((smallUsage / smallLockers) * 100) : 0
  const mediumPercentage = mediumLockers > 0 ? Math.round((mediumUsage / mediumLockers) * 100) : 0
  const largePercentage = largeLockers > 0 ? Math.round((largeUsage / largeLockers) * 100) : 0

  // Thống kê theo loại người dùng
  const shipperOrders = orders.filter(o => o.senderType === "shipper").length
  const regularOrders = orders.filter(o => o.senderType === "regular").length
  const totalOrders = orders.length
  
  const shipperPercentage = totalOrders > 0 ? Math.round((shipperOrders / totalOrders) * 100) : 0
  const regularPercentage = totalOrders > 0 ? Math.round((regularOrders / totalOrders) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2E3192]">Báo cáo thống kê</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Thống kê chi tiết về việc sử dụng hệ thống tủ</p>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Tổng lượt sử dụng</CardTitle>
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground mt-1">Tất cả thời gian</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Báo lỗi (30 ngày)</CardTitle>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{errorsLast30Days}</div>
            <p className="text-xs text-muted-foreground mt-1">Trong 30 ngày gần đây</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Sử dụng hôm nay</CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{todayUsage}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {parseInt(usageChange) > 0 ? `+${usageChange}%` : `${usageChange}%`} so với hôm qua
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">TB mỗi ngày</CardTitle>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{averageUsagePerDay}</div>
            <p className="text-xs text-muted-foreground mt-1">7 ngày qua</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Tủ phổ biến nhất</CardTitle>
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{mostUsedLocker}</div>
            <p className="text-xs text-muted-foreground mt-1">{maxUsage} lượt sử dụng</p>
          </CardContent>
        </Card>
      </div>

        {/* Charts - Responsive Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Xu hướng giao dịch 7 ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Số giao dịch",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-64 sm:h-72"
            >
              <BarChart data={ordersByDay} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent nameKey="count" />} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Lượt sử dụng của các tủ</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Lượt sử dụng", color: "hsl(var(--chart-2))" },
              }}
              className="h-64 sm:h-72"
            >
              <BarChart data={lockerUsageData} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="locker" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent nameKey="count" />} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        </div>

        {/* Usage by Locker Size - Responsive */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Thống kê theo kích thước tủ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-medium">Tủ nhỏ</span>
                <div className="flex items-center gap-4">
                  <div className="w-full sm:w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${smallPercentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{smallPercentage}%</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-medium">Tủ vừa</span>
                <div className="flex items-center gap-4">
                  <div className="w-full sm:w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${mediumPercentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{mediumPercentage}%</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-medium">Tủ lớn</span>
                <div className="flex items-center gap-4">
                  <div className="w-full sm:w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${largePercentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{largePercentage}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage by User Type - Responsive */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Thống kê theo loại người dùng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Shipper</span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">{shipperPercentage}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${shipperPercentage}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Người gửi thường</span>
                  <span className="text-xl sm:text-2xl font-bold text-green-600">{regularPercentage}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${regularPercentage}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
