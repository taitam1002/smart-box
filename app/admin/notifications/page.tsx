"use client"

import { useEffect, useState } from "react"
import { getNotifications, getLockers, markNotificationAsRead, receiveErrorReport, startProcessingError, resolveErrorReport, notifyCustomerAboutErrorResolution, closeErrorReport, getErrorReports, markAllAdminNotificationsAsRead } from "@/lib/firestore-actions"
import { UnifiedPagination } from "@/components/ui/unified-pagination"
import { AlertCircle, AlertTriangle, Info, Check, Package, Play, CheckCircle, Bell, Lock } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

const notificationIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])
  const [errorReports, setErrorReports] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const router = useRouter()

  useEffect(() => {
    // realtime notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    )

    const unsubscribeNotifs = onSnapshot(notificationsQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        }
      })
      
      // Lọc chỉ thông báo hệ thống (không có customerId) và KHÔNG có cờ privateToCustomer
      const systemNotifications = next.filter(notification => !notification.customerId && !notification.privateToCustomer)
      setNotifications(systemNotifications)
      // Nếu đang ở trang vượt quá tổng trang sau khi realtime cập nhật, quay về trang cuối hợp lệ
      const totalPages = Math.max(1, Math.ceil(systemNotifications.length / PAGE_SIZE))
      setPage((p) => Math.min(p, totalPages))
    })

    // lockers can stay as one-time load
    const loadLockers = async () => {
      try {
        const lockerList = await getLockers()
        setLockers(lockerList)
      } catch (e) {
        console.error("Lỗi tải tủ:", e)
      }
    }
    loadLockers()

    // Load error reports to track status with real-time updates
    const errorReportsQuery = query(
      collection(db, "errors"),
      orderBy("createdAt", "desc")
    )

    const unsubscribeErrors = onSnapshot(errorReportsQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          receivedAt: data?.receivedAt?.toDate ? data.receivedAt.toDate() : data.receivedAt,
          processingStartedAt: data?.processingStartedAt?.toDate ? data.processingStartedAt.toDate() : data.processingStartedAt,
          resolvedAt: data?.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt,
          customerNotifiedAt: data?.customerNotifiedAt?.toDate ? data.customerNotifiedAt.toDate() : data.customerNotifiedAt,
        }
      })
      setErrorReports(next)
    })

    return () => {
      unsubscribeNotifs()
      unsubscribeErrors()
    }
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      toast({
        title: "Thành công",
        description: "Đã đánh dấu thông báo là đã đọc",
      })
    } catch (e) {
      console.error("Lỗi đánh dấu đã đọc:", e)
      toast({
        title: "Lỗi",
        description: "Không thể đánh dấu thông báo là đã đọc",
        variant: "destructive",
      })
    }
  }

  // Đánh dấu đã đọc mà không hiển thị toast
  const markAsReadSilently = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch (e) {
      console.error("Lỗi đánh dấu đã đọc:", e)
    }
  }

  // Check if error is resolved
  const truncateErrorMessage = (message: string) => {
    // Tìm vị trí "báo lỗi:" (không phân biệt hoa thường)
    const match = message.match(/(.*?báo lỗi:\s*)(.+)/i)
    if (match) {
      const prefix = match[1] // Phần trước "báo lỗi:"
      const errorText = match[2] // Phần sau "báo lỗi:"
      
      // Nếu phần sau "báo lỗi:" dài hơn 20 ký tự, truncate
      if (errorText.length > 20) {
        return prefix + errorText.substring(0, 20) + "..."
      }
    }
    return message
  }

  const isErrorResolved = (notification: any) => {
    // Tìm errorId từ notification
    let errorId = notification.errorId
    if (!errorId && notification.message) {
      const match = notification.message.match(/lỗi:\s*(\w+)/i)
      if (match) {
        errorId = match[1]
      }
    }
    if (!errorId) {
      errorId = notification.id
    }
    
    const errorReport = errorReports.find(er => er.id === errorId)
    return errorReport?.status === "resolved" || errorReport?.processingStage === "notified"
  }

  const handleProcessError = async (notification: any, action: string) => {
    try {
      // Tìm errorId từ message hoặc sử dụng notification.id
      let errorId = notification.errorId
      
      // Nếu không có errorId, thử tìm từ message
      if (!errorId && notification.message) {
        // Tìm pattern "lỗi: xxx" trong message
        const match = notification.message.match(/lỗi:\s*(\w+)/i)
        if (match) {
          errorId = match[1]
        }
      }
      
      // Fallback nếu vẫn không tìm thấy
      if (!errorId) {
        errorId = notification.id
      }
      
      const customerId = notification.customerId
      
      if (!customerId) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy thông tin khách hàng",
          variant: "destructive",
        })
        return
      }
      
      // Thực hiện hành động tương ứng
      switch (action) {
        case 'receive':
          await receiveErrorReport(errorId, "Đã tiếp nhận lỗi từ admin")
          toast({
            title: "Thành công",
            description: "Đã tiếp nhận lỗi",
          })
          break
        case 'process':
          await startProcessingError(errorId, "Đang xử lý lỗi")
          toast({
            title: "Thành công", 
            description: "Đã bắt đầu xử lý lỗi",
          })
          break
        case 'resolve':
          await resolveErrorReport(errorId, "Đã xử lý xong lỗi")
          toast({
            title: "Thành công",
            description: "Đã hoàn thành xử lý lỗi",
          })
          break
        case 'notify':
          await notifyCustomerAboutErrorResolution(errorId, customerId)
          toast({
            title: "Thành công",
            description: "Đã thông báo khách hàng",
          })
          break
        case 'close':
          await closeErrorReport(errorId)
          toast({
            title: "Thành công",
            description: "Đã đóng lỗi",
          })
          break
      }
      
      // Cập nhật UI - đánh dấu thông báo đã đọc
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
      
    } catch (e) {
      console.error("Lỗi xử lý lỗi:", e)
      toast({
        title: "Lỗi",
        description: "Không thể xử lý lỗi: " + (e as Error).message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Thông báo</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 items-start sm:items-center justify-between mt-1">
          <p className="text-muted-foreground">Theo dõi các thông báo và cảnh báo từ hệ thống</p>
          <button
            onClick={async () => {
              try {
                await markAllAdminNotificationsAsRead()
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
                toast({ title: "Thành công", description: "Đã đánh dấu tất cả thông báo là đã đọc" })
              } catch (e) {
                toast({ title: "Lỗi", description: "Không thể đánh dấu tất cả là đã đọc", variant: "destructive" })
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[#2E3192] text-white shadow-md hover:shadow-lg transition-all duration-200 hover:bg-[#1a1d6b]"
          >
            <Check className="h-4 w-4" />
            Đã đọc tất cả
          </button>
        </div>
      </div>


      <div className="space-y-4">
        {notifications
          .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
          .map((notification) => {
          const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info
          const colorClass =
            notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.info
          const locker = notification.lockerId ? lockers.find((l) => l.id === notification.lockerId) : null

          return (
            <div key={notification.id} className={`border-2 rounded-lg ${colorClass}`}>
              <div className="p-4 sm:p-6 relative">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2 rounded-lg bg-white">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border border-gray-300 bg-white capitalize">
                            {notification.type === "error"
                              ? "Lỗi"
                              : notification.type === "warning"
                                ? "Cảnh báo"
                                : notification.type === "customer_action"
                                  ? "Hoạt động khách hàng"
                                  : "Thông tin"}
                          </span>
                          {!notification.isRead && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#E31E24] text-white">
                              Mới
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm sm:text-base whitespace-normal break-words">
                          {notification.type === "error" 
                            ? truncateErrorMessage(notification.message)
                            : notification.message}
                        </p>
                        {locker && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Tủ số: {locker.lockerNumber} - Kích thước:{" "}
                            {locker.size === "small" ? "Nhỏ" : locker.size === "medium" ? "Vừa" : "Lớn"}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {notification.type === "error" && (
                          isErrorResolved(notification) ? (
                            <button
                              onClick={async () => {
                                // Đánh dấu thông báo đã đọc (không hiển thị toast)
                                await markAsReadSilently(notification.id)
                                
                                // Tìm errorId từ notification
                                let errorId = notification.errorId
                                if (!errorId && notification.message) {
                                  const match = notification.message.match(/lỗi:\s*(\w+)/i)
                                  if (match) {
                                    errorId = match[1]
                                  }
                                }
                                if (!errorId) {
                                  errorId = notification.id
                                }
                                router.push(`/admin/error-reports?errorId=${errorId}&highlight=true`)
                              }}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-green-600 text-white  hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1 text-white" />
                              <span className="text-white font-medium text-">Đã xử lý</span>
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                // Đánh dấu thông báo đã đọc (không hiển thị toast)
                                await markAsReadSilently(notification.id)
                                
                                // Tìm errorId từ notification
                                let errorId = notification.errorId
                                if (!errorId && notification.message) {
                                  const match = notification.message.match(/lỗi:\s*(\w+)/i)
                                  if (match) {
                                    errorId = match[1]
                                  }
                                }
                                if (!errorId) {
                                  errorId = notification.id
                                }
                                router.push(`/admin/error-reports?errorId=${errorId}&highlight=true`)
                              }}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Xử lý
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Nút nhỏ góc dưới phải cho thông báo không phải lỗi */}
                {!notification.isRead && notification.type !== "error" && (
                  <button 
                    onClick={() => handleMarkRead(notification.id)}
                    className="absolute bottom-3 right-3 inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Đã đọc
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination controls (bottom) */}
        <UnifiedPagination page={page} setPage={setPage} total={notifications.length} pageSize={PAGE_SIZE} />
    </div>
  )
}



