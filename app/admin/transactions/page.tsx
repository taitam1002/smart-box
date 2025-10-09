"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Lịch sử giao dịch</h2>
        <p className="text-muted-foreground mt-1">Xem lịch sử tất cả các giao dịch trong hệ thống</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
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
              {orders.map((order) => (
                <TableRow key={order.id}>
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
        </CardContent>
      </Card>
    </div>
  )
}
