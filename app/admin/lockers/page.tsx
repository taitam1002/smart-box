"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getLockers, getTransactions, dedupeLockers } from "@/lib/firestore-actions"
import { ensureDefaultLockers } from "@/lib/seed-data"
import { Package, Search, Eye, User, Phone, Calendar } from "lucide-react"
import { toast } from "sonner"
import type { LockerStatus } from "@/lib/types"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"

const statusColors: Record<LockerStatus, string> = {
  available: "bg-green-500",
  occupied: "bg-blue-500",
  maintenance: "bg-yellow-500",
  error: "bg-red-500",
}

const statusLabels: Record<LockerStatus, string> = {
  available: "Khả dụng",
  occupied: "Đang sử dụng",
  maintenance: "Bảo trì",
  error: "Lỗi",
}

export default function LockersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [lockers, setLockers] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  // Remove add-locker UI per request
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedLocker, setSelectedLocker] = useState<any>(null)
  const [currentTransaction, setCurrentTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Realtime lockers
    const lockersQuery = query(collection(db, "lockers"), orderBy("lastUpdated", "desc"))
    const unsubscribeLockers = onSnapshot(lockersQuery, (snapshot) => {
      // Chỉ tạo 6 tủ mặc định nếu chưa có tủ nào, KHÔNG reset dữ liệu hiện có
      if (snapshot.empty) {
        ensureDefaultLockers().catch(() => {})
      }
      const next = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          lastUpdated: data?.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated,
          status: typeof data.status === "string" ? data.status.trim() : data.status,
          lockerNumber: typeof data.lockerNumber === "string" ? data.lockerNumber.trim() : data.lockerNumber,
        }
      })
      // Collapse duplicates by lockerNumber on the client to avoid showing many cards
      const grouped = new Map<string, any>()
      for (const item of next) {
        const key = String(item.lockerNumber || "").trim().toUpperCase()
        if (!grouped.has(key)) {
          grouped.set(key, item)
          continue
        }
        const existing = grouped.get(key)
        const preferCanonical = String(item.id).toUpperCase() === key && String(existing.id).toUpperCase() !== key
        const preferLatest = (item.lastUpdated?.getTime?.() ?? 0) > (existing.lastUpdated?.getTime?.() ?? 0)
        if (preferCanonical || preferLatest) {
          grouped.set(key, item)
        }
      }
      const uniqueList = Array.from(grouped.values())
      // Chỉ gọi dedupe khi thực sự có duplicate và ít nhất 2 tủ
      if (uniqueList.length < next.length && next.length >= 2) {
        console.log(`🔄 Phát hiện ${next.length - uniqueList.length} tủ duplicate, đang xử lý...`)
        dedupeLockers().catch(() => {})
      }
      setLockers(uniqueList)
    })

    // Realtime transactions (for details modal)
    const txQuery = query(collection(db, "transactions"), orderBy("createdAt", "desc"))
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
      setTransactions(next)
    })

    return () => {
      unsubscribeLockers()
      unsubscribeTx()
    }
  }, [])

  // add-locker handler removed

  const handleViewLockerDetails = (locker: any) => {
    setSelectedLocker(locker)
    
    // Tìm giao dịch đang diễn ra với tủ này
    const activeTransaction = transactions.find(
      (tx) => tx.lockerId === locker.id && tx.status === "delivered"
    )
    
    setCurrentTransaction(activeTransaction)
    setIsViewDialogOpen(true)
  }

  const filteredLockers = lockers.filter((locker) => {
    // Kiểm tra locker và lockerNumber tồn tại
    if (!locker || !locker.lockerNumber) return false
    
    const matchesSearch = locker.lockerNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || locker.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Quản lý tủ</h2>
          <p className="text-muted-foreground mt-1">Theo dõi và quản lý trạng thái các tủ trong hệ thống</p>
        </div>
        {/* Nút thêm tủ đã được loại bỏ theo yêu cầu */}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo số tủ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="available">Khả dụng</SelectItem>
                <SelectItem value="occupied">Đang sử dụng</SelectItem>
                <SelectItem value="maintenance">Bảo trì</SelectItem>
                <SelectItem value="error">Lỗi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lockers Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {filteredLockers.map((locker) => (
          <Card 
            key={locker.id} 
            className={`hover:shadow-lg transition-shadow cursor-pointer ${
              locker.status === "occupied" ? "ring-2 ring-blue-200" : ""
            }`}
            onClick={() => handleViewLockerDetails(locker)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{locker.lockerNumber}</CardTitle>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className={`${statusColors[locker.status as LockerStatus]} text-white w-full justify-center`}>
                {statusLabels[locker.status as LockerStatus]}
              </Badge>
              <div className="text-xs text-muted-foreground">
                <p>Kích thước: {locker.size === "small" ? "Nhỏ" : locker.size === "medium" ? "Vừa" : "Lớn"}</p>
                <p className="mt-1">
                  Cập nhật:{" "}
                  {new Date(locker.lastUpdated).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {locker.status === "occupied" && (
                <Button size="sm" variant="outline" className="w-full bg-blue-50 text-blue-700 border-blue-200">
                  <Eye className="h-4 w-4 mr-2" />
                  Xem chi tiết
                </Button>
              )}
              {locker.status === "error" && (
                <Button size="sm" variant="destructive" className="w-full">
                  Xử lý lỗi
                </Button>
              )}
              {locker.status === "maintenance" && (
                <Button size="sm" variant="outline" className="w-full bg-transparent">
                  Hoàn tất bảo trì
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Locker Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Chi tiết tủ {selectedLocker?.lockerNumber}
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về tủ và giao dịch đang diễn ra
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Locker Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Số tủ</Label>
                <p className="text-lg font-semibold">{selectedLocker?.lockerNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Kích thước</Label>
                <p className="text-lg font-semibold">
                  {selectedLocker?.size === "small" ? "Nhỏ" : selectedLocker?.size === "medium" ? "Vừa" : "Lớn"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Trạng thái</Label>
                <Badge className={`${statusColors[selectedLocker?.status as LockerStatus]} text-white`}>
                  {statusLabels[selectedLocker?.status as LockerStatus]}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Cập nhật lần cuối</Label>
                <p className="text-sm">
                  {selectedLocker?.lastUpdated && new Date(selectedLocker.lastUpdated).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {/* Transaction Info */}
            {currentTransaction ? (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Thông tin giao dịch đang diễn ra
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Người gửi</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{currentTransaction.senderName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{currentTransaction.senderPhone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Người nhận</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{currentTransaction.receiverName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{currentTransaction.receiverPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Thời gian gửi</Label>
                      <p className="text-sm">
                        {new Date(currentTransaction.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Thời gian nhận hàng</Label>
                      <p className="text-sm">
                        {currentTransaction.pickedUpAt 
                          ? new Date(currentTransaction.pickedUpAt).toLocaleString("vi-VN")
                          : "Chưa có"
                        }
                      </p>
                    </div>
                  </div>
                  {currentTransaction.orderCode && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Mã đơn hàng</Label>
                      <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {currentTransaction.orderCode}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t pt-6 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Tủ hiện tại không có giao dịch đang diễn ra</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
