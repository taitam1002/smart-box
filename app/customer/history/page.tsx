"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { UnifiedPagination } from "@/components/ui/unified-pagination"
import { getCurrentUser } from "@/lib/auth"
import { getUserTransactions, getLockers, getUserDeliveryInfo, saveTransaction, updateDeliveryInfo, saveNotification } from "@/lib/firestore-actions"
import { Search, Package, Clock, CheckCircle } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  useEffect(() => {
    const u = getCurrentUser()
    setUser(u)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    // Hàm tạo transaction từ delivery_info nếu chưa có
    const createMissingTransactions = async () => {
      try {
        const deliveryInfos = await getUserDeliveryInfo(user.id)
        console.log("🔍 Kiểm tra delivery_info chưa có transaction:", deliveryInfos.length)
        
        for (const di of deliveryInfos) {
          // Nếu chưa có orderId, tạo transaction mới
          if (!di.orderId && di.fingerprintVerified) {
            console.log("📦 Tạo transaction từ delivery_info:", di.id)
            try {
              const newOrder: any = {
                senderId: di.senderId,
                senderName: di.receiverName, // Với giữ hàng, sender = receiver
                senderPhone: di.receiverPhone,
                senderType: "regular",
                receiverName: di.receiverName,
                receiverPhone: di.receiverPhone,
                lockerId: di.lockerId,
                status: "delivered" as const,
                createdAt: di.createdAt,
                deliveredAt: di.createdAt,
                transactionType: "hold" as const,
              }
              
              const newOrderId = await saveTransaction(newOrder)
              console.log("✅ Đã tạo transaction:", newOrderId)
              
              // Gửi thông báo cho admin để không bỏ sót các đơn giữ hàng được khôi phục
              try {
                await saveNotification({
                  type: "customer_action",
                  message: `${di.receiverName || "Khách hàng"} đã giữ hàng tại tủ ${di.lockerNumber || di.lockerId}`,
                  lockerId: di.lockerId,
                  orderId: newOrderId,
                  isRead: false,
                  createdAt: new Date(),
                })
              } catch (notificationError) {
                console.error("Lỗi gửi thông báo giữ hàng:", notificationError)
              }
              
              // Cập nhật delivery_info với orderId
              await updateDeliveryInfo(di.id, { orderId: newOrderId })
            } catch (e) {
              console.error("Lỗi tạo transaction từ delivery_info:", e)
            }
          }
        }
      } catch (e) {
        console.error("Lỗi kiểm tra delivery_info:", e)
      }
    }

    // Tạo transaction cho các đơn giữ hàng chưa có transaction
    createMissingTransactions()
    
    // KHÔNG tự động fix trạng thái tủ mỗi khi load trang
    // Chỉ fix khi thực sự cần thiết (ví dụ: khi admin yêu cầu)
    // Việc tự động fix có thể gây ra vấn đề: cập nhật lại tủ từ transaction cũ
    // sau khi người dùng đã xóa dữ liệu tủ
    // 
    // Nếu cần fix, có thể gọi thủ công từ admin panel hoặc khi có transaction mới
    // const fixLockerStatus = async () => {
    //   try {
    //     await fixLockerStatusForTransactions()
    //   } catch (e) {
    //     console.error("Lỗi fix trạng thái tủ:", e)
    //   }
    // }
    // fixLockerStatus()

    // realtime transactions for this user
    const txQuery = query(
      collection(db, "transactions"),
      where("senderId", "==", user.id)
    )
    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          deliveredAt: data?.deliveredAt?.toDate ? data.deliveredAt.toDate() : data.deliveredAt,
          pickedUpAt: data?.pickedUpAt?.toDate ? data.pickedUpAt.toDate() : data.pickedUpAt,
        }
      })
      // sort client-side by createdAt desc to avoid composite index requirement
      next.sort((a: any, b: any) => {
        const ta = a.createdAt?.getTime?.() ?? 0
        const tb = b.createdAt?.getTime?.() ?? 0
        return tb - ta
      })
      console.log("📋 Lịch sử gửi hàng - Tổng số đơn:", next.length)
      console.log("📋 Chi tiết đơn hàng:", next.map(o => ({
        id: o.id,
        transactionType: o.transactionType,
        receiverName: o.receiverName,
        status: o.status
      })))
      setOrders(next)
    }, (err) => { console.error("Lỗi realtime transactions:", err) })

    // one-time lockers load
    const loadLockers = async () => {
      try {
        const ls = await getLockers()
        setLockers(ls)
      } catch {}
    }
    loadLockers()

    return () => {
      unsubscribeTx()
    }
  }, [user?.id])

  const userOrders = orders
  const filteredOrders = userOrders.filter(
    (order) =>
      order.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.receiverPhone?.includes(searchTerm),
  )

  // Reset về trang 1 khi thay đổi từ khóa tìm kiếm hoặc số lượng kết quả
  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const startIdx = (page - 1) * PAGE_SIZE
  const endIdx = startIdx + PAGE_SIZE
  const paginated = filteredOrders.slice(startIdx, endIdx)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Lịch sử gửi hàng</h2>
        <p className="text-muted-foreground mt-1">Xem lại tất cả các đơn hàng bạn đã gửi</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {paginated.map((order) => {
            const locker = lockers.find((l) => l.id === order.lockerId)
            return (
              <Card
                key={order.id}
                className={
                  `border transition-colors hover:shadow-sm ` +
                  (order.status === "delivered"
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-green-500 bg-green-50/40")
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-xl truncate">Người nhận: {order.receiverName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 truncate"> SĐT: {order.receiverPhone}</p>
                    </div>
                    {order.status === "delivered" && (
                      <Badge className="bg-blue-700 text-white whitespace-nowrap">
                        <Clock className="h-3 w-3 mr-1" />
                        Chờ lấy hàng
                      </Badge>
                    )}
                    {order.status === "picked_up" && (
                      <Badge className="bg-green-700 text-white whitespace-nowrap">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đã lấy hàng
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-white/90 p-4 border-gray-300">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Loại gửi hàng</p>
                      <p className="mt-1 font-medium">
                        {order.transactionType === "hold" 
                          ? "Giữ hàng" 
                          : order.senderType === "shipper" 
                            ? "Shipper" 
                            : "Người gửi bình thường"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white/90 p-4 border-gray-300">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Số tủ</p>
                      <p className="mt-1 font-medium">{locker?.lockerNumber || "-"}</p>
                    </div>
                    <div className="rounded-lg border bg-white/90 p-4 border-gray-300">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Thời gian gửi</p>
                      <p className="mt-1 font-medium">
                        {order.deliveredAt
                          ? new Date(order.deliveredAt).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </p>
                    </div>
                    {order.pickedUpAt && (
                      <div className="rounded-lg border bg-white/90 p-4 border-gray-300">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Thời gian lấy hàng</p>
                        <p className="mt-1 font-medium">
                          {new Date(order.pickedUpAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {/* Pagination */}
          <UnifiedPagination 
            page={page} 
            setPage={setPage} 
            total={filteredOrders.length} 
            pageSize={PAGE_SIZE} 
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Không tìm thấy đơn hàng nào</p>
              <p className="text-sm mt-1">Thử tìm kiếm với từ khóa khác</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
