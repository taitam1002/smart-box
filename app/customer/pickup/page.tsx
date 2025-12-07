"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentUser } from "@/lib/auth"
import { getUserTransactions, getLockers, pickupPackage, saveNotification, verifyPickupCode } from "@/lib/firestore-actions"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { Key } from "lucide-react"
import { toast } from "sonner"

export default function PickupPage() {
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultTitle, setResultTitle] = useState("")
  const [resultMessage, setResultMessage] = useState("")
  const [pickupCode, setPickupCode] = useState("")
  const [useAccountPhone, setUseAccountPhone] = useState(true)
  const [selectedPhone, setSelectedPhone] = useState("")

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    if (!currentUser) return
    
    const load = async () => {
      try {
        const [txs, lockerList] = await Promise.all([
          getUserTransactions(currentUser.id),
          getLockers()
        ])
        setOrders(txs)
        setLockers(lockerList)
      } catch (e) {
        console.error("Lỗi tải dữ liệu:", e)
      }
    }
    load()
  }, [])

  const handlePickupByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pickupCode.trim()) {
      toast.error("Vui lòng nhập mã lấy hàng")
      return
    }

    // Kiểm tra nếu không dùng số điện thoại tài khoản
    if (!useAccountPhone && !selectedPhone) {
      toast.error("Vui lòng chọn số điện thoại nhận SMS")
      return
    }

    try {
      setLoading(true)
      
      // Chuẩn hóa số điện thoại để so sánh
      const normalizePhone = (phone: string) => {
        if (!phone) return ""
        let normalized = phone.replace(/\D/g, "") // Xóa tất cả ký tự không phải số
        if (normalized.startsWith("84")) {
          normalized = "+" + normalized
        } else if (normalized.startsWith("0")) {
          normalized = "+84" + normalized.slice(1)
        } else {
          normalized = "+84" + normalized
        }
        return normalized
      }

      // Xác định số điện thoại cần kiểm tra
      const phoneToCheck = useAccountPhone 
        ? normalizePhone(user?.phone || "") 
        : normalizePhone(selectedPhone)

      // Kiểm tra code và phone từ delivery_info trên Firebase
      const verification = await verifyPickupCode(pickupCode.trim(), phoneToCheck)
      
      if (!verification.success || !verification.transactionId) {
        toast.error("Mã lấy hàng không đúng hoặc không khớp với số điện thoại")
        setResultTitle("Không thể nhận hàng")
        setResultMessage("Mã lấy hàng hoặc số điện thoại không đúng. Vui lòng kiểm tra lại và thử lại lần nữa.")
        setShowResultModal(true)
        return
      }

      // Tìm transaction tương ứng
      const targetOrder = orders.find(order => order.id === verification.transactionId)
      
      if (!targetOrder || targetOrder.status !== "delivered" || targetOrder.transactionType !== "send") {
        toast.error("Không tìm thấy đơn hàng hợp lệ")
        setResultTitle("Không thể nhận hàng")
        setResultMessage("Không tìm thấy đơn hàng phù hợp với mã lấy hàng này. Vui lòng kiểm tra lại thông tin.")
        setShowResultModal(true)
        return
      }

      // Nhận hàng và mở cửa
      await pickupPackage(targetOrder.id)
      const lockerLabel = verification.deliveryInfo?.lockerNumber 
        || lockers.find((l) => l.id === targetOrder.lockerId)?.lockerNumber 
        || targetOrder.lockerId
      
      // Cập nhật door = "open" cho locker
      const lockerDocId = verification.deliveryInfo?.lockerNumber || verification.deliveryInfo?.lockerId
      if (lockerDocId) {
        try {
          const lockerRef = doc(db, "lockers", lockerDocId)
          await updateDoc(lockerRef, {
            door: "open",
            status: "available",
            lastUpdated: new Date()
          })
          console.log("✅ Đã mở cửa tủ:", lockerDocId)
        } catch (e) {
          console.error("Lỗi cập nhật trạng thái cửa:", e)
        }
      }
      
      // Thông báo cho khách hàng về việc đã nhận hàng
      try {
        await saveNotification({
          type: "customer_action",
          message: `Bạn đã nhận hàng thành công từ tủ ${lockers.find(l=>l.id===targetOrder.lockerId)?.lockerNumber || targetOrder.lockerId}`,
          customerId: user.id,
          orderId: targetOrder.id,
          lockerId: targetOrder.lockerId,
          isRead: false,
          createdAt: new Date(),
        })
      } catch {}

      // Thông báo cho admin về việc khách đã nhận hàng
      try {
        await saveNotification({
          type: "customer_action",
          message: `${user.name || "Khách hàng"} đã nhận hàng từ tủ ${lockerLabel}`,
          lockerId: targetOrder.lockerId,
          orderId: targetOrder.id,
          isRead: false,
          createdAt: new Date(),
        })
      } catch (e) {
        console.error("Lỗi tạo thông báo cho admin (nhận bằng mã):", e)
      }

      // Hiển thị bảng kết quả + toast
      setResultTitle("Nhận hàng thành công")
      setResultMessage(`Bạn đã nhận hàng thành công tại tủ ${lockerLabel}. Vui lòng lấy hàng ra khỏi tủ và đóng cửa lại.`)
      setShowResultModal(true)
      console.log("✅ Đặt showResultModal = true, locker:", lockerLabel)
      toast.success(`Đã nhận hàng thành công tại tủ ${lockerLabel}!`)
      
      // Reload data
      const [txs, lockerList] = await Promise.all([
        getUserTransactions(user.id),
        getLockers()
      ])
      setOrders(txs)
      setLockers(lockerList)
      setPickupCode("")
      setSelectedPhone("")
      setUseAccountPhone(true)
      
    } catch (error) {
      console.error("Lỗi khi nhận hàng:", error)
      toast.error("Có lỗi xảy ra khi nhận hàng")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Nhận hàng</h2>
        <p className="text-muted-foreground">Nhận hàng từ tủ thông minh</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Nhập mã lấy hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePickupByCode} className="space-y-4">
            <div>
              <Label htmlFor="pickupCode">Mã lấy hàng (6 số)</Label>
              <Input
                id="pickupCode"
                type="text"
                placeholder="Nhập mã 6 số từ SMS"
                value={pickupCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6)
                  setPickupCode(digits)
                }}
                maxLength={6}
                className="text-center text-lg font-mono text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useAccountPhone"
                checked={useAccountPhone}
                onCheckedChange={(checked) => {
                  setUseAccountPhone(checked as boolean)
                  if (checked) {
                    setSelectedPhone("")
                  }
                }}
              />
              <Label 
                htmlFor="useAccountPhone" 
                className="text-sm font-normal cursor-pointer"
              >
                Tôi đang dùng đúng số điện thoại ({user?.phone || "N/A"}) trong thông tin tài khoản để nhận hàng
              </Label>
            </div>
            
            {!useAccountPhone && (
              <div>
                <Label htmlFor="phoneInput">Số điện thoại nhận SMS *</Label>
                <Input
                  id="phoneInput"
                  type="tel"
                  placeholder="Nhập số điện thoại nhận SMS (10 số)"
                  value={selectedPhone}
                  onChange={(e) => {
                    // Chỉ cho phép nhập số, giới hạn 10 số
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setSelectedPhone(digits)
                  }}
                  maxLength={10}
                  inputMode="numeric"
                  required={!useAccountPhone}
                  className="text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nhập số điện thoại mà SMS mã lấy hàng được gửi đến (10 số)
                </p>
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={loading || !pickupCode.trim() || (!useAccountPhone && !selectedPhone)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? "Đang xử lý..." : "Xác nhận lấy hàng"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resultTitle}</DialogTitle>
            <DialogDescription>{resultMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={() => setShowResultModal(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              Đã hiểu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
