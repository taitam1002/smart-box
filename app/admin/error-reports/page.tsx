"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UnifiedPagination } from "@/components/ui/unified-pagination"
import { getErrorReports, receiveErrorReport, startProcessingError, resolveErrorReport, notifyCustomerAboutErrorResolution, closeErrorReport } from "@/lib/firestore-actions"
import { AlertCircle, Check, Play, CheckCircle, Bell, Lock, Clock, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { ErrorReport, ErrorStatus, ErrorProcessingStage } from "@/lib/types"

const statusColors: Record<ErrorStatus, string> = {
  pending: "bg-yellow-500",
  received: "bg-blue-500", 
  processing: "bg-orange-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500"
}

const statusLabels: Record<ErrorStatus, string> = {
  pending: "Chờ xử lý",
  received: "Đã tiếp nhận",
  processing: "Đang xử lý", 
  resolved: "Đã xử lý",
  closed: "Đã đóng"
}

const stageLabels: Record<ErrorProcessingStage, string> = {
  reported: "Đã báo cáo",
  received: "Đã tiếp nhận",
  processing: "Đang xử lý",
  resolved: "Đã xử lý", 
  notified: "Đã thông báo"
}

function ErrorReportsContent() {
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([])
  const [loading, setLoading] = useState(true)
  const [highlightedErrorId, setHighlightedErrorId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const searchParams = useSearchParams()

  useEffect(() => {
    const loadErrorReports = async () => {
      try {
        const reports = await getErrorReports()
        setErrorReports(reports)
      } catch (error) {
        console.error("Lỗi tải danh sách báo lỗi:", error)
      } finally {
        setLoading(false)
      }
    }

    loadErrorReports()
  }, [])

  // Handle errorId parameter for scrolling and highlighting
  useEffect(() => {
    const errorId = searchParams.get('errorId')
    if (errorId && errorReports.length > 0) {
      // Find the error report
      const targetReport = errorReports.find(report => report.id === errorId)
      if (targetReport) {
        // Scroll to the element
        const element = document.getElementById(`error-${errorId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          
          // Highlight the element
          setHighlightedErrorId(errorId)
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedErrorId(null)
          }, 3000)
        }
      }
    }
  }, [searchParams, errorReports])

  const handleErrorAction = async (errorId: string, action: string, customerId: string) => {
    try {
      switch (action) {
        case 'receive':
          await receiveErrorReport(errorId, "Đã tiếp nhận lỗi từ admin")
          break
        case 'process':
          await startProcessingError(errorId, "Đang xử lý lỗi")
          break
        case 'resolve':
          await resolveErrorReport(errorId, "Đã xử lý xong lỗi")
          break
        case 'notify':
          await notifyCustomerAboutErrorResolution(errorId, customerId)
          break
        case 'close':
          await closeErrorReport(errorId)
          break
      }
      
      // Reload data
      const reports = await getErrorReports()
      setErrorReports(reports)
      
      toast({
        title: "Thành công",
        description: `Đã ${action === 'receive' ? 'tiếp nhận' : action === 'process' ? 'bắt đầu xử lý' : action === 'resolve' ? 'hoàn thành xử lý' : action === 'notify' ? 'thông báo khách hàng' : 'đóng'} lỗi`,
      })
    } catch (error) {
      console.error("Lỗi xử lý lỗi:", error)
      toast({
        title: "Lỗi",
        description: "Không thể xử lý lỗi",
        variant: "destructive",
      })
    }
  }

  const getNextActions = (status: ErrorStatus, stage: ErrorProcessingStage) => {
    const actions = []
    
    if (status === "pending") {
      actions.push({ key: 'receive', label: 'Tiếp nhận', icon: Check, color: 'bg-blue-600' })
    }
    if (status === "received") {
      actions.push({ key: 'process', label: 'Xử lý', icon: Play, color: 'bg-orange-600' })
    }
    if (status === "processing") {
      actions.push({ key: 'resolve', label: 'Hoàn thành', icon: CheckCircle, color: 'bg-green-600' })
    }
    if (status === "resolved" && stage !== "notified") {
      actions.push({ key: 'notify', label: 'Thông báo KH', icon: Bell, color: 'bg-purple-600' })
    }
    if (stage === "notified") {
      actions.push({ key: 'close', label: 'Đóng', icon: Lock, color: 'bg-gray-600' })
    }
    
    return actions
  }

  // Format date/time robustly, handling Date, string, number or Firestore Timestamp-like objects
  const formatDateTime = (value?: unknown) => {
    if (!value) return "-"
    let date: Date | null = null
    if (value instanceof Date) {
      date = value
    } else if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value as any)
      date = isNaN(d.getTime()) ? null : d
    } else if (typeof value === "object" && value !== null && "seconds" in (value as any)) {
      // Firestore Timestamp-like: { seconds, nanoseconds }
      const v: any = value
      const ms = v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1_000_000)
      const d = new Date(ms)
      date = isNaN(d.getTime()) ? null : d
    }
    if (!date) return "-"
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Quản lý báo lỗi</h2>
          <p className="text-muted-foreground mt-1">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Quản lý báo lỗi</h2>
        <p className="text-muted-foreground mt-1">Theo dõi và xử lý các báo lỗi từ khách hàng</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm theo khách hàng, ID, tủ, mô tả, trạng thái..."
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>STT</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Tủ</TableHead>
                <TableHead>Mô tả lỗi</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian tiếp nhận</TableHead>
                <TableHead>Thời gian hoàn thành</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterReports(errorReports, search)
                .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                .map((report, idx) => {
                const index = (page - 1) * PAGE_SIZE + idx
                const nextActions = getNextActions(report.status, report.processingStage)
                const isHighlighted = highlightedErrorId === report.id
                return (
                  <TableRow 
                    key={report.id} 
                    id={`error-${report.id}`}
                    className={isHighlighted ? "ring-2 ring-blue-500 ring-opacity-75 bg-blue-50" : ""}
                  >
                    <TableCell>
                      <span className="font-medium text-gray-600">{index + 1}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{report.customerName}</p>
                          <p className="text-xs text-muted-foreground">ID: {report.customerId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {report.lockerId ? `Tủ ${report.lockerId}` : "Không xác định"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{report.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[report.status]} text-white`}>
                        {statusLabels[report.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {report.receivedAt ? (
                          <p className="text-blue-600 font-medium">{formatDateTime(report.receivedAt)}</p>
                        ) : (
                          <p className="text-muted-foreground">Chưa tiếp nhận</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {report.resolvedAt ? (
                          <p className="text-green-600 font-medium">{formatDateTime(report.resolvedAt)}</p>
                        ) : (
                          <p className="text-muted-foreground">Chưa hoàn thành</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {nextActions.map((action) => {
                          const Icon = action.icon
                          return (
                            <Button
                              key={action.key}
                              size="sm"
                              onClick={() => handleErrorAction(report.id, action.key, report.customerId)}
                              className={`${action.color} hover:opacity-90 text-white`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {action.label}
                            </Button>
                          )
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UnifiedPagination page={page} setPage={setPage} total={filterReports(errorReports, search).length} pageSize={PAGE_SIZE} />
    </div>
  )
}

export default function ErrorReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải danh sách báo lỗi...</p>
        </div>
      </div>
    }>
      <ErrorReportsContent />
    </Suspense>
  )
}

function filterReports(items: ErrorReport[], q: string) {
  const term = q.trim().toLowerCase()
  if (!term) return items
  return items.filter((r) => {
    const fields = [
      r.customerName,
      r.customerId,
      r.lockerId,
      r.description,
      r.status,
      r.processingStage,
    ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase())
    return fields.some((f) => f.includes(term))
  })
}

