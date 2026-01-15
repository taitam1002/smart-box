"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UnifiedPagination } from "@/components/ui/unified-pagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentUser } from "@/lib/auth"
import { Bell, Package, AlertCircle, Info, CheckCircle, Clock, X, Check, Eye } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, doc, getDoc, getDocs } from "firebase/firestore"
import { findUserByEmail, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/firestore-actions"
import { toast } from "@/hooks/use-toast"

const notificationIcons = {
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
  customer_action: Package,
  pickup: CheckCircle,
}

const notificationColors = {
  error: "text-red-600 bg-red-50 border-red-200",
  warning: "text-orange-600 bg-orange-50 border-orange-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
  customer_action: "text-green-600 bg-green-50 border-green-200",
  pickup: "text-purple-600 bg-purple-50 border-purple-200",
}

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [selectedErrorDetails, setSelectedErrorDetails] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const PAGE_SIZE = 10
  const DESCRIPTION_PREVIEW_LENGTH = 20

  useEffect(() => {
    const init = async () => {
      const currentUser = getCurrentUser()
      setUser(currentUser)

      if (!currentUser) {
        setLoading(false)
        return
      }

      const candidateIds = new Set<string>([currentUser.id])
      try {
        if (currentUser.email) {
          const profile = await findUserByEmail(currentUser.email)
          if (profile?.id) candidateIds.add(profile.id)
        }
      } catch {}

      const unsubscribers: Array<() => void> = []
      const all: any[] = []
      candidateIds.forEach((cid) => {
        const qRef = query(collection(db, "notifications"), where("customerId", "==", cid))
        const unsub = onSnapshot(qRef, (snapshot) => {
          const items = snapshot.docs.map((docSnap) => {
            const data: any = docSnap.data()
            return {
              id: docSnap.id,
              ...data,
              createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            }
          })
          // merge results from multiple listeners
          const map = new Map<string, any>()
          ;[...all, ...items].forEach((n) => map.set(n.id, n))
          const merged = Array.from(map.values()).sort((a: any, b: any) => {
            const ta = a?.createdAt?.getTime?.() ?? 0
            const tb = b?.createdAt?.getTime?.() ?? 0
            return tb - ta
          })
          setNotifications(merged)
          // Điều chỉnh trang hiện tại nếu vượt quá tổng trang sau khi realtime cập nhật
          const totalPages = Math.max(1, Math.ceil(merged.length / PAGE_SIZE))
          setPage((p) => Math.min(p, totalPages))
          setLoading(false)
        })
        unsubscribers.push(unsub)
      })

      return () => unsubscribers.forEach((fn) => fn())
    }

    const cleanupPromise = init()
    return () => { (cleanupPromise as any)?.then?.((fn: any) => fn?.()) }
  }, [])

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    toast({
      title: "Đã đóng thông báo",
      description: "Thông báo đã được ẩn khỏi danh sách",
    })
  }

  const markAllAsRead = async () => {
    if (!user) return
    
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast({
        title: "Thành công",
        description: "Đã đánh dấu tất cả thông báo là đã đọc",
      })
    } catch (error) {
      console.error("Lỗi đánh dấu tất cả thông báo:", error)
      toast({
        title: "Lỗi",
        description: "Không thể đánh dấu tất cả thông báo",
        variant: "destructive",
      })
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes} phút trước`
    if (hours < 24) return `${hours} giờ trước`
    return `${days} ngày trước`
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }

  const fetchErrorDetails = async (errorId: string) => {
    if (!errorId) return null
    
    setLoadingDetails(true)
    try {
      const errorDoc = await getDoc(doc(db, "errors", errorId))
      if (errorDoc.exists()) {
        const data = errorDoc.data()
        return {
          id: errorDoc.id,
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          resolvedAt: data?.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt,
          receivedAt: data?.receivedAt?.toDate ? data.receivedAt.toDate() : data.receivedAt,
          processingStartedAt: data?.processingStartedAt?.toDate ? data.processingStartedAt.toDate() : data.processingStartedAt,
          closedAt: data?.closedAt?.toDate ? data.closedAt.toDate() : data.closedAt,
          customerNotifiedAt: data?.customerNotifiedAt?.toDate ? data.customerNotifiedAt.toDate() : data.customerNotifiedAt,
        }
      }
      return null
    } catch (error) {
      console.error("Lỗi lấy thông tin chi tiết:", error)
      return null
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleViewDetails = async (notification: any) => {
    if (notification.errorId) {
      const details = await fetchErrorDetails(notification.errorId)
      setSelectedErrorDetails(details)
      setIsDescriptionDialogOpen(false)
      setIsDetailModalOpen(true)
    } else {
      // Nếu không có errorId, tìm error report gần nhất để lấy thông tin tủ
      try {
        const errorQuery = query(
          collection(db, "errors"),
          where("customerId", "==", user?.id),
          where("status", "==", "resolved")
        )
        const errorSnapshot = await getDocs(errorQuery)
        
        if (!errorSnapshot.empty) {
          // Lấy error report gần nhất với thời gian notification
          const notificationTime = notification.createdAt.getTime()
          const latestError = errorSnapshot.docs
            .map(doc => {
              const data = doc.data()
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                receivedAt: data.receivedAt?.toDate ? data.receivedAt.toDate() : data.receivedAt,
                processingStartedAt: data.processingStartedAt?.toDate ? data.processingStartedAt.toDate() : data.processingStartedAt,
                resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt,
                closedAt: data.closedAt?.toDate ? data.closedAt.toDate() : data.closedAt,
                customerNotifiedAt: data.customerNotifiedAt?.toDate ? data.customerNotifiedAt.toDate() : data.customerNotifiedAt,
              }
            })
            .sort((a, b) => {
              // Tìm error report có thời gian gần nhất với notification
              const timeDiffA = Math.abs(a.createdAt.getTime() - notificationTime)
              const timeDiffB = Math.abs(b.createdAt.getTime() - notificationTime)
              return timeDiffA - timeDiffB
            })[0]
          
          setSelectedErrorDetails(latestError)
          setIsDetailModalOpen(true)
        } else {
          // Fallback nếu không tìm thấy error report
          const mockDetails = {
            id: notification.id,
            description: notification.message || "Lỗi đã được báo cáo và xử lý thành công bởi hệ thống",
            status: notification.message?.includes("thành công") ? "resolved" : "pending",
            processingStage: notification.message?.includes("thành công") ? "resolved" : "reported",
            createdAt: notification.createdAt,
            lockerId: notification.lockerId || "Không xác định",
            adminNotes: "Thông báo từ hệ thống",
            receivedAt: null,
            processingStartedAt: null,
            resolvedAt: notification.message?.includes("thành công") ? notification.createdAt : null,
            closedAt: null,
            customerNotifiedAt: null,
          }
          setSelectedErrorDetails(mockDetails)
          setIsDetailModalOpen(true)
        }
      } catch (error) {
        console.error("Lỗi tìm error report:", error)
        // Fallback
        const mockDetails = {
          id: notification.id,
          description: notification.message || "Lỗi đã được báo cáo và xử lý thành công bởi hệ thống",
          status: notification.message?.includes("thành công") ? "resolved" : "pending",
          processingStage: notification.message?.includes("thành công") ? "resolved" : "reported",
          createdAt: notification.createdAt,
          lockerId: notification.lockerId || "Không xác định",
          adminNotes: "Thông báo từ hệ thống",
          receivedAt: null,
          processingStartedAt: null,
          resolvedAt: notification.message?.includes("thành công") ? notification.createdAt : null,
          closedAt: null,
          customerNotifiedAt: null,
        }
        setSelectedErrorDetails(mockDetails)
        setIsDetailModalOpen(true)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Thông báo</h2>
          <p className="text-muted-foreground mt-1">Đang tải thông báo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Thông báo của bạn</h2>
          <p className="text-muted-foreground mt-1">Theo dõi các thông báo về đơn hàng và báo lỗi</p>
        </div>
        {notifications.length > 0 && notifications.some(n => !n.isRead) && (
          <Button 
            onClick={markAllAsRead}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2E3192] hover:bg-[#1a1d6b] text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Check className="h-4 w-4" />
            Đã đọc tất cả
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Bạn chưa có thông báo nào</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-3 sm:space-y-4">
          {notifications
            .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            .map((notification) => {
            const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info
            const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.info

            return (
              <Card 
                key={notification.id} 
                className={`border-2 ${colorClass} ${!notification.isRead ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={async () => {
                  if (!notification.isRead) {
                    await markNotificationAsRead(notification.id)
                    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
                  }
                }}
              >
                <CardContent className="p-4 sm:p-6 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dismissNotification(notification.id)
                    }}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Đóng thông báo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="p-2 rounded-lg bg-white flex-shrink-0">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex flex-shrink-0 items-center px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-medium border border-gray-300 bg-white capitalize">
                              {notification.type === "error"
                                ? "Báo lỗi"
                                : notification.type === "warning"
                                  ? "Cảnh báo"
                                  : notification.type === "customer_action"
                                    ? "Đơn hàng"
                                    : "Thông tin"}
                            </span>
                            {!notification.isRead && (
                              <span className="inline-flex flex-shrink-0 items-center px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-medium bg-[#E31E24] text-white">
                                Mới
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-sm sm:text-base whitespace-normal break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-0 sm:items-center sm:flex-shrink-0 self-start">
                          {(notification.type === "error" || 
                            (notification.type === "info" && notification.message?.includes("xử lý")) ||
                            (notification.type === "info" && notification.message?.includes("báo cáo"))) && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetails(notification)
                              }}
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Xem chi tiết
                            </Button>
                          )}
                        </div>
                        {!notification.isRead && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await markNotificationAsRead(notification.id)
                              setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
                              toast({
                                title: "Thành công",
                                description: "Đã đánh dấu thông báo là đã đọc",
                              })
                            }}
                            className="absolute bottom-3 right-3 inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <UnifiedPagination page={page} setPage={setPage} total={notifications.length} pageSize={PAGE_SIZE} />
        </>
      )}

      {/* Modal chi tiết lỗi */}
      <Dialog 
        open={isDetailModalOpen} 
        onOpenChange={(open) => {
          setIsDetailModalOpen(open)
          if (!open) {
            setIsDescriptionDialogOpen(false)
            setSelectedErrorDetails(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2E3192]">
              Chi tiết báo lỗi
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2E3192]"></div>
              <span className="ml-2">Đang tải thông tin...</span>
            </div>
          ) : selectedErrorDetails ? (
            <div className="space-y-6">
              {/* Thông tin cơ bản */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Thông tin cơ bản</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Trạng thái:</label>
                    <Badge 
                      variant={selectedErrorDetails.status === 'resolved' ? 'default' : 'secondary'}
                      className={selectedErrorDetails.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {selectedErrorDetails.status === 'resolved' ? 'Đã xử lý' : 'Đang xử lý'}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <label className="text-sm font-medium text-gray-600">Tủ gặp lỗi:</label>
                    <p className="text-sm text-gray-800 font-semibold break-words">
                      {selectedErrorDetails.lockerId || 'Không xác định'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mô tả lỗi */}
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg text-gray-800">Mô tả lỗi</h3>
                <p className="text-sm text-gray-800 bg-white p-3 rounded border break-words">
                  {(() => {
                    const fullDescription = typeof selectedErrorDetails.description === "string" 
                      ? selectedErrorDetails.description 
                      : ""
                    if (!fullDescription) return "Không có mô tả"
                    if (fullDescription.length <= DESCRIPTION_PREVIEW_LENGTH) return fullDescription
                    return `${fullDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH)}...`
                  })()}
                </p>
                {typeof selectedErrorDetails.description === "string" && selectedErrorDetails.description.length > DESCRIPTION_PREVIEW_LENGTH && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs font-medium w-full sm:w-auto"
                    onClick={() => setIsDescriptionDialogOpen(true)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Xem nội dung đầy đủ
                  </Button>
                )}
              </div>

              {/* Thời gian xử lý */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">Thời gian xử lý</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <label className="text-sm font-medium text-gray-600">Thời gian báo cáo:</label>
                      <p className="text-sm text-gray-800">{formatDateTime(selectedErrorDetails.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedErrorDetails.receivedAt && selectedErrorDetails.receivedAt instanceof Date && !isNaN(selectedErrorDetails.receivedAt.getTime()) && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-600">Thời gian tiếp nhận:</label>
                        <p className="text-sm text-gray-800">{formatDateTime(selectedErrorDetails.receivedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedErrorDetails.processingStartedAt && selectedErrorDetails.processingStartedAt instanceof Date && !isNaN(selectedErrorDetails.processingStartedAt.getTime()) && (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-600">Thời gian bắt đầu xử lý:</label>
                        <p className="text-sm text-gray-800">{formatDateTime(selectedErrorDetails.processingStartedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedErrorDetails.resolvedAt && selectedErrorDetails.resolvedAt instanceof Date && !isNaN(selectedErrorDetails.resolvedAt.getTime()) && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-600">Thời gian hoàn thành:</label>
                        <p className="text-sm text-gray-800">{formatDateTime(selectedErrorDetails.resolvedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedErrorDetails.closedAt && selectedErrorDetails.closedAt instanceof Date && !isNaN(selectedErrorDetails.closedAt.getTime()) && (
                    <div className="flex items-center gap-3">
                      <X className="h-4 w-4 text-gray-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-600">Thời gian đóng:</label>
                        <p className="text-sm text-gray-800">{formatDateTime(selectedErrorDetails.closedAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* Hiển thị thông báo nếu không có chi tiết đầy đủ */}
                  {!selectedErrorDetails.receivedAt && !selectedErrorDetails.processingStartedAt && 
                   !selectedErrorDetails.resolvedAt && !selectedErrorDetails.closedAt && (
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <Info className="h-4 w-4 inline mr-2" />
                        Thông báo này được tạo tự động bởi hệ thống. 
                        Để xem chi tiết đầy đủ về quá trình xử lý, vui lòng liên hệ quản trị viên.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">Không tìm thấy thông tin chi tiết</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
        <DialogContent className="w-[90vw] max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#2E3192]">
              Nội dung mô tả đầy đủ
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg border">
            <p className="text-sm whitespace-pre-wrap break-words break-all leading-relaxed">
              {typeof selectedErrorDetails?.description === "string" && selectedErrorDetails.description.trim().length
                ? selectedErrorDetails.description
                : "Không có mô tả"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

