"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UnifiedPagination } from "@/components/ui/unified-pagination"
import { getTransactions, getLockers } from "@/lib/firestore-actions"
import type { OrderStatus, Order, Locker } from "@/lib/types"

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-500",
  delivered: "bg-blue-500",
  picked_up: "bg-green-500",
  expired: "bg-red-500",
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xử lý",
  delivered: "Đã gửi",
  picked_up: "Đã lấy",
  expired: "Hết hạn",
}

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [lockers, setLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, lockersData] = await Promise.all([
          getTransactions(),
          getLockers()
        ])
        setOrders(ordersData)
        setLockers(lockersData)
      } catch (error) {
        console.error("Lỗi tải dữ liệu giao dịch:", error)
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
          <h2 className="text-3xl font-bold text-[#2E3192]">Lịch sử giao dịch</h2>
          <p className="text-muted-foreground mt-1">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  // Tìm kiếm đơn giản theo tên/sđt người gửi, người nhận, mã đơn, số tủ
  const filtered = orders.filter((order) => {
    const sender = `${order.senderName} ${order.senderPhone}`.toLowerCase()
    const receiver = `${order.receiverName} ${order.receiverPhone}`.toLowerCase()
    const code = (order.orderCode || "").toLowerCase()
    const lockerNumber = lockers.find((l) => l.id === order.lockerId)?.lockerNumber?.toLowerCase?.() || ""
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return (
      sender.includes(q) ||
      receiver.includes(q) ||
      code.includes(q) ||
      lockerNumber.includes(q)
    )
  })

  // Phân trang
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startIdx = (page - 1) * PAGE_SIZE
  const endIdx = startIdx + PAGE_SIZE
  const paginated = filtered.slice(startIdx, endIdx)

  // Reset về trang 1 mỗi khi thay đổi từ khóa tìm kiếm
  // hoặc dữ liệu orders thay đổi đáng kể
  // (tránh nằm ở trang cao hơn số trang mới)
  if (page !== 1 && startIdx >= total) {
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#2E3192] line-clamp-2 break-words" title="Lịch sử giao dịch">Lịch sử giao dịch</h2>
        <p className="text-muted-foreground mt-1">Xem lịch sử tất cả các giao dịch trong hệ thống</p>
        {/* <p className="text-medium text-[#2E3192] mt-1 font-bold">Tổng số giao dịch: {orders.length}</p> */}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, SĐT, mã đơn, số tủ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
              <TableHead>STT</TableHead>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Người gửi</TableHead>
                <TableHead>Người nhận</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Số tủ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian gửi</TableHead>
                <TableHead>Thời gian lấy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((order, index) => (
                <TableRow key={order.id}>
                  <TableCell className="text-muted-foreground">{startIdx + index + 1}</TableCell>
                  <TableCell className="font-medium">{order.orderCode || "N/A"}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.senderName}</p>
                      <p className="text-xs text-muted-foreground">{order.senderPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.receiverName}</p>
                      <p className="text-xs text-muted-foreground">{order.receiverPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.senderType === "shipper" ? "Shipper" : "Người gửi"}</Badge>
                  </TableCell>
                  <TableCell>{lockers.find((l) => l.id === order.lockerId)?.lockerNumber}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[order.status]} text-white`}>{statusLabels[order.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {order.deliveredAt
                      ? new Date(order.deliveredAt).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {order.pickedUpAt
                      ? new Date(order.pickedUpAt).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Pagination */}
          <UnifiedPagination 
            page={page} 
            setPage={setPage} 
            total={filtered.length} 
            pageSize={PAGE_SIZE} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
