"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getLockers, saveError, getUserErrorReports, saveNotification } from "@/lib/firestore-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"

export default function ReportErrorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [lockerId, setLockerId] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [myReports, setMyReports] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])
  const [lockerError, setLockerError] = useState<string>("")

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || currentUser.role !== "customer") {
      router.push("/")
      return
    }
    setUser(currentUser)

    // Load lockers once
    const loadLockers = async () => {
      try {
        const lockersData = await getLockers()
        setLockers(lockersData)
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error)
      }
    }
    loadLockers()

    // Realtime my error reports
    const errQuery = query(
      collection(db, "errors"),
      where("customerId", "==", currentUser.id)
    )
    const unsubscribe = onSnapshot(errQuery, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          resolvedAt: data?.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt,
        }
      })
      next.sort((a: any, b: any) => {
        const ta = a.createdAt?.getTime?.() ?? 0
        const tb = b.createdAt?.getTime?.() ?? 0
        return tb - ta
      })
      setMyReports(next)
    })
    
    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lockerId) {
      setLockerError("Vui lòng chọn tủ gặp lỗi")
      return
    }

    if (!description.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng mô tả lỗi gặp phải",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const newReport = {
        customerId: user.id,
        customerName: user.name,
        lockerId: lockerId || undefined,
        description,
        status: "pending" as const,
        createdAt: new Date(),
      }

      // Lưu báo lỗi vào Firestore
      await saveError(newReport)

      // Gửi thông báo cho admin
      await saveNotification({
        type: "error",
        message: `Khách hàng ${user.name} báo lỗi: ${description}`,
        lockerId: lockerId || undefined,
        customerId: user.id,
        isRead: false,
        createdAt: new Date(),
      })
      
      // Cập nhật danh sách báo lỗi local
      setMyReports([{ id: `error-${Date.now()}`, ...newReport }, ...myReports])

      toast({
        title: "Báo lỗi thành công",
        description: "Báo cáo của bạn đã được gửi đến quản trị viên",
      })

      setLockerId("")
      setDescription("")
      setLockerError("")
    } catch (error) {
      console.error("Lỗi báo lỗi:", error)
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi gửi báo cáo. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2E3192]">Báo lỗi</h1>
          <p className="text-muted-foreground mt-2">
            Gặp vấn đề với tủ? Hãy cho chúng tôi biết để được hỗ trợ nhanh nhất
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#E31E24]" />
              Gửi báo cáo lỗi
            </CardTitle>
            <CardDescription>Mô tả chi tiết vấn đề bạn gặp phải để chúng tôi có thể hỗ trợ tốt nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="locker">Số tủ <span className="text-red-600">*</span></Label>
                <Select
                  value={lockerId}
                  onValueChange={(val) => {
                    setLockerId(val)
                    if (lockerError) setLockerError("")
                  }}
                >
                  <SelectTrigger id="locker" className={lockerError ? "border-red-500 focus:ring-red-500" : undefined}>
                    <SelectValue placeholder="Chọn tủ gặp lỗi" />
                  </SelectTrigger>
                  <SelectContent>
                    {lockers
                      .filter((locker) => typeof locker?.id === "string" && locker.id.trim() !== "")
                      .map((locker) => (
                        <SelectItem key={locker.id} value={`${locker.id}`}>
                          Tủ {locker.lockerNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {lockerError && (
                  <p className="text-sm text-red-600">{lockerError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả lỗi *</Label>
                <Textarea
                  id="description"
                  placeholder="Ví dụ: Tủ không mở được sau khi nhập vân tay, màn hình không hiển thị..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-[#E31E24] hover:bg-[#E31E24]/90" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Đang gửi..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Gửi báo cáo
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử báo lỗi của bạn</CardTitle>
            <CardDescription>Theo dõi trạng thái các báo cáo lỗi đã gửi</CardDescription>
          </CardHeader>
          <CardContent>
            {myReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Bạn chưa có báo cáo lỗi nào</div>
            ) : (
              <div className="space-y-4">
                {myReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{report.description}</p>
                        {report.lockerId && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Tủ: {lockers.find((l) => l.id === report.lockerId)?.lockerNumber}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(report.createdAt)}</p>
                      </div>
                      <div>
                        {report.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle className="h-3 w-3" />
                            Đang xử lý
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Đã xử lý
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
