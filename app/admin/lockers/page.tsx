"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getLockers, getTransactions, dedupeLockers, getErrorReportsByLockerId } from "@/lib/firestore-actions"
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
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [selectedErrorLocker, setSelectedErrorLocker] = useState<any>(null)
  const [errorReports, setErrorReports] = useState<any[]>([])
  const [isLoadingErrors, setIsLoadingErrors] = useState(false)
  const [errorDialogTransaction, setErrorDialogTransaction] = useState<any>(null)
  const [maintenanceDialogTransaction, setMaintenanceDialogTransaction] = useState<any>(null)

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
      // Collapse duplicates by lockerNumber trên client để tránh hiển thị trùng
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
      // KHÔNG tự động gọi dedupe để tránh mất liên kết giao dịch/`currentOrderId`
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
    setSelectedErrorLocker(null) // reset để tránh dùng nhầm state từ dialog khác
    setErrorDialogTransaction(null)
    
    // Chỉ hiển thị giao dịch đang diễn ra khi tủ thực sự đang được sử dụng
    let activeTransaction = null
    if (locker.status === "occupied") {
      activeTransaction = transactions.find(
        (tx) => tx.lockerId === locker.id && tx.status === "delivered"
      )
    }
    // Nếu tủ đang bảo trì nhưng có hàng (currentOrderId), chuẩn bị giao dịch để hiển thị
    let maintenanceTx = null
    if (!activeTransaction && locker.status === "maintenance" && locker.currentOrderId) {
      maintenanceTx = transactions.find((t) => t.id === locker.currentOrderId) || null
    }

    setCurrentTransaction(activeTransaction)
    setMaintenanceDialogTransaction(maintenanceTx)
    setIsViewDialogOpen(true)
  }

  const handleViewErrorDetails = async (locker: any) => {
    setSelectedErrorLocker(locker)
    setIsErrorDialogOpen(true)
    setIsLoadingErrors(true)
    // Reset state của dialog khác để tránh rò rỉ dữ liệu
    setSelectedLocker(null)
    setCurrentTransaction(null)
    setMaintenanceDialogTransaction(null)
    // Tìm giao dịch đang diễn ra nếu tủ bảo trì nhưng vẫn có hàng
    let tx: any = null
    if (locker?.currentOrderId) {
      tx = transactions.find((t) => t.id === locker.currentOrderId) || null
    }
    if (!tx) {
      tx = transactions.find((t) => t.lockerId === locker.id && t.status === "delivered") || null
    }
    setErrorDialogTransaction(tx)
    
    try {
      const reports = await getErrorReportsByLockerId(locker.id)
      setErrorReports(reports)
    } catch (error) {
      console.error("Lỗi tải báo lỗi:", error)
      toast.error("Không thể tải danh sách báo lỗi")
    } finally {
      setIsLoadingErrors(false)
    }
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewErrorDetails(locker)
                  }}
                >
                  Xem chi tiết lỗi
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

            {/* Nếu tủ đang bảo trì nhưng còn hàng, hiển thị cảnh báo và chi tiết đơn */}
            {selectedLocker?.status === "maintenance" && maintenanceDialogTransaction && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Thông tin giao dịch đang diễn ra
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Người gửi</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{maintenanceDialogTransaction.senderName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{maintenanceDialogTransaction.senderPhone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Người nhận</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{maintenanceDialogTransaction.receiverName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{maintenanceDialogTransaction.receiverPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Thời gian gửi</Label>
                    <p className="text-sm">{new Date(maintenanceDialogTransaction.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Mã đơn hàng</Label>
                    <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {maintenanceDialogTransaction.orderCode || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
            ) : !maintenanceDialogTransaction ? (
              <div className="border-t pt-6 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Tủ hiện tại không có giao dịch đang diễn ra</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Details Dialog */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Báo lỗi từ khách hàng - Tủ {selectedErrorLocker?.lockerNumber}
            </DialogTitle>
            <DialogDescription>
              Danh sách các báo lỗi mà khách hàng đã gửi về tủ này
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Locker Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Số tủ</Label>
                <p className="text-lg font-semibold">{selectedErrorLocker?.lockerNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Kích thước</Label>
                <p className="text-lg font-semibold">
                  {selectedErrorLocker?.size === "small" ? "Nhỏ" : selectedErrorLocker?.size === "medium" ? "Vừa" : "Lớn"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Trạng thái</Label>
                <Badge className={`${statusColors[selectedErrorLocker?.status as LockerStatus]} text-white`}>
                  {statusLabels[selectedErrorLocker?.status as LockerStatus]}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Cập nhật lần cuối</Label>
                <p className="text-sm">
                  {selectedErrorLocker?.lastUpdated && new Date(selectedErrorLocker.lastUpdated).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {/* Error Reports */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Báo lỗi từ khách hàng ({errorReports.length})
              </h3>
              
              {isLoadingErrors ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Đang tải báo lỗi...</p>
                  </div>
                </div>
              ) : errorReports.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">Chưa có báo lỗi nào từ khách hàng</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {errorReports.map((report) => (
                    <Card key={report.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{report.customerName}</span>
                            <Badge 
                              variant={
                                report.status === "pending" ? "secondary" :
                                report.status === "received" ? "default" :
                                report.status === "processing" ? "outline" :
                                report.status === "resolved" ? "default" : "secondary"
                              }
                              className={
                                report.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                report.status === "received" ? "bg-blue-100 text-blue-800" :
                                report.status === "processing" ? "bg-orange-100 text-orange-800" :
                                report.status === "resolved" ? "bg-green-100 text-green-800" : ""
                              }
                            >
                              {report.status === "pending" ? "Chờ xử lý" :
                               report.status === "received" ? "Đã tiếp nhận" :
                               report.status === "processing" ? "Đang xử lý" :
                               report.status === "resolved" ? "Đã xử lý" : report.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Mô tả lỗi:</Label>
                            <p className="text-sm mt-1 bg-gray-50 p-3 rounded border">
                              {report.description}
                            </p>
                          </div>
                          
                          {report.adminNotes && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Ghi chú admin:</Label>
                              <p className="text-sm mt-1 bg-blue-50 p-3 rounded border">
                                {report.adminNotes}
                              </p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Giai đoạn:</span> {report.processingStage}
                            </div>
                            {report.resolvedAt && (
                              <div>
                                <span className="font-medium">Hoàn thành:</span> {new Date(report.resolvedAt).toLocaleString("vi-VN")}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsErrorDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
