"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentUser } from "@/lib/auth"
import { saveTransaction, getLockers, updateLockerStatus, saveNotification, findUserByEmail } from "@/lib/firestore-actions"
import { SMSService } from "@/lib/sms-service"
import { Package, Archive, Fingerprint } from "lucide-react"

export default function SendPackagePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showFingerprintModal, setShowFingerprintModal] = useState(false)
  const [lockers, setLockers] = useState<any[]>([])
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalMessage, setModalMessage] = useState("")
  const [modalTitle, setModalTitle] = useState("")

  const [sendFormData, setSendFormData] = useState({
    receiverName: "",
    receiverPhone: "",
    orderCode: "",
    lockerSize: "",
  })

  const [holdFormData, setHoldFormData] = useState({
    receiverName: "",
    receiverPhone: "",
    lockerSize: "",
  })

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
    // Load lockers from Firestore
    const loadLockers = async () => {
      try {
        const lockersData = await getLockers()
        setLockers(lockersData)
        console.log("[Send] Loaded lockers:", lockersData)
        // Debug: Hiển thị thông tin tủ
        const availableLockers = lockersData.filter(l => l.status === "available")
        console.log("🔍 Tủ khả dụng:", availableLockers.map(l => `${l.lockerNumber} (${l.size})`))
      } catch (error) {
        console.error("Lỗi tải danh sách tủ:", error)
      }
    }
    
    loadLockers()
  }, [])

  // Helper functions for modals
  const showSuccess = (title: string, message: string) => {
    setModalTitle(title)
    setModalMessage(message)
    setShowSuccessModal(true)
  }

  const showError = (title: string, message: string) => {
    setModalTitle(title)
    setModalMessage(message)
    setShowErrorModal(true)
  }

  const handleSendPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Đảm bảo có senderId
      let senderId = user?.id
      if (!senderId && user?.email) {
        const found = await findUserByEmail(user.email)
        if (found) {
          senderId = found.id
          const normalized = { ...user, id: found.id }
          setUser(normalized)
          if (typeof window !== "undefined") {
            localStorage.setItem("currentUser", JSON.stringify(normalized))
          }
        }
      }
      if (!senderId) {
        throw new Error("Không xác định được tài khoản. Vui lòng đăng nhập lại.")
      }
      
      // Tìm tủ khả dụng theo kích cỡ được chọn
      let availableLocker = null
      
      if (sendFormData.lockerSize) {
        console.log(`🔍 Tìm tủ kích cỡ: ${sendFormData.lockerSize}`)
        // Tìm tủ có kích cỡ phù hợp
        availableLocker = lockers.find((l) => 
          (l.status || "").trim() === "available" && 
          l.size === sendFormData.lockerSize
        )
        
        if (availableLocker) {
          console.log(`✅ Tìm thấy tủ phù hợp: ${availableLocker.lockerNumber} (${availableLocker.size})`)
        } else {
          console.log(`❌ Không có tủ ${sendFormData.lockerSize} trống`)
        }
      } else {
        // Nếu không chọn kích cỡ, tìm tủ bất kỳ
        availableLocker = lockers.find((l) => (l.status || "").trim() === "available")
        console.log(`🔍 Tìm tủ bất kỳ: ${availableLocker?.lockerNumber} (${availableLocker?.size})`)
      }
      if (availableLocker) {
        // Tạo mã 6 số cho việc lấy hàng
        const pickupCode = SMSService.generateCode()
        
        const newOrder: any = {
          senderId,
          senderName: user.name,
          senderPhone: user.phone,
          senderType: user.customerType || "regular",
          receiverName: sendFormData.receiverName,
          receiverPhone: sendFormData.receiverPhone,
          lockerId: availableLocker.id,
          status: "delivered" as const,
          createdAt: new Date(),
          deliveredAt: new Date(),
          pickupCode,
          transactionType: "send" as const,
        }
        if (user.customerType === "shipper" && sendFormData.orderCode) {
          newOrder.orderCode = sendFormData.orderCode
        }
        
        // Lưu giao dịch vào Firestore
        const newOrderId = await saveTransaction(newOrder)
        
        // Cập nhật trạng thái tủ (không chặn luồng nếu lỗi)
        try {
          await updateLockerStatus(availableLocker.id, "occupied", newOrderId)
        } catch (e) {
          console.error("Lỗi cập nhật trạng thái tủ:", e)
        }

        // Gửi SMS cho người nhận (không chặn luồng nếu lỗi)
        try {
          const isShipper = user.customerType === "shipper"
          await SMSService.sendPickupCode(
            sendFormData.receiverPhone,
            sendFormData.receiverName,
            user.name,
            pickupCode,
            sendFormData.orderCode,
            isShipper
          )
        } catch (e) {
          console.error("Lỗi gửi SMS:", e)
        }

        // Gửi thông báo cho admin (không chặn luồng nếu lỗi)
        try {
          await saveNotification({
            type: "customer_action",
            message: `${user.name} đã gửi hàng vào tủ ${availableLocker.lockerNumber}`,
            lockerId: availableLocker.id,
            // Không có customerId để admin có thể thấy
            orderId: newOrderId,
            isRead: false,
            createdAt: new Date(),
          })
        } catch (e) {
          console.error("Lỗi gửi thông báo:", e)
        }

        // Gửi thông báo cho chính khách hàng
        try {
          await saveNotification({
            type: "customer_action",
            message: `Bạn đã gửi hàng thành công vào tủ ${availableLocker.lockerNumber}. Mã lấy hàng đã được gửi cho người nhận`,
            customerId: senderId,
            lockerId: availableLocker.id,
            orderId: newOrderId,
            isRead: false,
            createdAt: new Date(),
          })
        } catch (e) {
          console.error("Lỗi tạo thông báo cho khách hàng:", e)
        }
        
        const sizeLabel = availableLocker.size === "small" ? "Nhỏ" : availableLocker.size === "medium" ? "Vừa" : "Lớn"
        showSuccess(
          "Gửi hàng thành công!",
          `Tủ số: ${availableLocker.lockerNumber}\nKích cỡ: ${sizeLabel}\nMã lấy hàng đã được gửi qua SMS.`
        )
      } else {
        if (sendFormData.lockerSize) {
          const sizeLabel = sendFormData.lockerSize === "small" ? "Nhỏ" : sendFormData.lockerSize === "medium" ? "Vừa" : "Lớn"
          
          // Hiển thị danh sách tủ khả dụng
          const availableLockers = lockers.filter(l => l.status === "available")
          const availableSizes = [...new Set(availableLockers.map(l => l.size))]
          const sizeLabels = availableSizes.map(size => 
            size === "small" ? "Nhỏ" : size === "medium" ? "Vừa" : "Lớn"
          )
          
          showError("Lỗi",`Hiện tại tủ ${sizeLabel} đã hết. Mời bạn chọn loại tủ khác để thay thế.\n\nTủ khả dụng: ${sizeLabels.join(", ")}`)
        } else {
          showError("Lỗi","Không có tủ trống. Vui lòng thử lại sau.")
        }
      }
    } catch (error: any) {
      console.error("Lỗi gửi hàng:", error)
      showError("Lỗi",error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  const handleHoldPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Tìm tủ khả dụng theo kích cỡ được chọn
      let availableLocker = null
      
      if (holdFormData.lockerSize) {
        // Tìm tủ có kích cỡ phù hợp
        availableLocker = lockers.find((l) => 
          (l.status || "").trim() === "available" && 
          l.size === holdFormData.lockerSize
        )
      } else {
        // Nếu không chọn kích cỡ, tìm tủ bất kỳ
        availableLocker = lockers.find((l) => (l.status || "").trim() === "available")
      }
      if (availableLocker) {
        setLoading(false)
        setShowFingerprintModal(true)

        // Simulate fingerprint scan completion after 3 seconds
        setTimeout(async () => {
          try {
            // Đảm bảo có senderId
            let senderId2 = user?.id
            if (!senderId2 && user?.email) {
              const found = await findUserByEmail(user.email)
              if (found) {
                senderId2 = found.id
                const normalized = { ...user, id: found.id }
                setUser(normalized)
                if (typeof window !== "undefined") {
                  localStorage.setItem("currentUser", JSON.stringify(normalized))
                }
              }
            }
            if (!senderId2) {
              throw new Error("Không xác định được tài khoản. Vui lòng đăng nhập lại.")
            }
            const newOrder: any = {
              senderId: senderId2,
              senderName: user.name,
              senderPhone: user.phone,
              senderType: user.customerType || "regular",
              receiverName: holdFormData.receiverName,
              receiverPhone: holdFormData.receiverPhone,
              lockerId: availableLocker.id,
              status: "delivered" as const,
              createdAt: new Date(),
              deliveredAt: new Date(),
              transactionType: "hold" as const,
            }
            
            // Lưu giao dịch vào Firestore
            const newOrderId = await saveTransaction(newOrder)
            
            // Cập nhật trạng thái tủ (không chặn luồng nếu lỗi)
            try {
              await updateLockerStatus(availableLocker.id, "occupied", newOrderId)
            } catch (e) {
              console.error("Lỗi cập nhật trạng thái tủ:", e)
            }

            // Gửi thông báo cho admin (không chặn luồng nếu lỗi)
            try {
              await saveNotification({
                type: "customer_action",
                message: `${user.name} đã giữ hàng tại tủ ${availableLocker.lockerNumber}`,
                lockerId: availableLocker.id,
                // Không có customerId để admin có thể thấy
                orderId: newOrderId,
                isRead: false,
                createdAt: new Date(),
              })
            } catch (e) {
              console.error("Lỗi gửi thông báo:", e)
            }
            
            setShowFingerprintModal(false)
            const sizeLabel = availableLocker.size === "small" ? "Nhỏ" : availableLocker.size === "medium" ? "Vừa" : "Lớn"
            showError("Lỗi",`Giữ hàng thành công! Tủ số: ${availableLocker.lockerNumber} (Kích cỡ: ${sizeLabel})`)
            setHoldFormData({ receiverName: "", receiverPhone: "", lockerSize: "" })
          } catch (error) {
            console.error("Lỗi giữ hàng:", error)
            showError("Lỗi","Đã xảy ra lỗi. Vui lòng thử lại.")
            setShowFingerprintModal(false)
          }
        }, 3000)
      } else {
        if (holdFormData.lockerSize) {
          const sizeLabel = holdFormData.lockerSize === "small" ? "Nhỏ" : holdFormData.lockerSize === "medium" ? "Vừa" : "Lớn"
          
          // Hiển thị danh sách tủ khả dụng
          const availableLockers = lockers.filter(l => l.status === "available")
          const availableSizes = [...new Set(availableLockers.map(l => l.size))]
          const sizeLabels = availableSizes.map(size => 
            size === "small" ? "Nhỏ" : size === "medium" ? "Vừa" : "Lớn"
          )
          
          showError("Lỗi",`Hiện tại tủ ${sizeLabel} đã hết. Mời bạn chọn loại tủ khác để thay thế.\n\nTủ khả dụng: ${sizeLabels.join(", ")}`)
        } else {
          showError("Lỗi","Không có tủ trống. Vui lòng thử lại sau.")
        }
        setLoading(false)
      }
    } catch (error) {
      console.error("Lỗi giữ hàng:", error)
      showError("Lỗi","Đã xảy ra lỗi. Vui lòng thử lại.")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Quản lý gửi hàng</h2>
        <p className="text-muted-foreground mt-1">Gửi hàng hoặc giữ hàng trong tủ thông minh</p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Gửi hàng
          </TabsTrigger>
          <TabsTrigger value="hold" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Giữ hàng
          </TabsTrigger>
        </TabsList>

        {/* Send Package Tab */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {user?.customerType === "shipper" ? "Thông tin giao hàng (Shipper)" : "Thông tin người nhận"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendPackage} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="send-receiverName">Tên người nhận *</Label>
                  <Input
                    id="send-receiverName"
                    placeholder="Nhập tên người nhận"
                    value={sendFormData.receiverName}
                    onChange={(e) => setSendFormData({ ...sendFormData, receiverName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="send-receiverPhone">Số điện thoại người nhận *</Label>
                  <Input
                    id="send-receiverPhone"
                    type="tel"
                    placeholder="Nhập số điện thoại"
                    value={sendFormData.receiverPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setSendFormData({ ...sendFormData, receiverPhone: digits })
                    }}
                    pattern="^\d{10}$"
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>

                {user?.customerType === "shipper" && (
                  <div className="space-y-2">
                    <Label htmlFor="orderCode">Mã đơn hàng *</Label>
                    <Input
                      id="orderCode"
                      placeholder="Nhập mã đơn hàng"
                      value={sendFormData.orderCode}
                      maxLength={8}
                      onChange={(e) => {
                        const val = (e.target.value || "").toString().slice(0, 8)
                        setSendFormData({ ...sendFormData, orderCode: val })
                      }}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="send-lockerSize">Kích cỡ tủ *</Label>
                  <Select
                    value={sendFormData.lockerSize}
                    onValueChange={(value) => setSendFormData({ ...sendFormData, lockerSize: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kích cỡ tủ phù hợp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Nhỏ - Phù hợp cho tài liệu, điện thoại</SelectItem>
                      <SelectItem value="medium">Vừa - Phù hợp cho túi xách, giày dép</SelectItem>
                      <SelectItem value="large">Lớn - Phù hợp cho balo, hộp lớn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#E31E24] hover:bg-[#C01A1F] text-white"
                  >
                    {loading ? "Đang xử lý..." : "Xác nhận gửi hàng"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hold" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin giữ hàng</CardTitle>
              <p className="text-sm text-muted-foreground">Giữ hàng trong tủ với xác thực vân tay</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleHoldPackage} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hold-receiverName">Tên người nhận *</Label>
                  <Input
                    id="hold-receiverName"
                    placeholder="Nhập tên người nhận"
                    value={holdFormData.receiverName}
                    onChange={(e) => setHoldFormData({ ...holdFormData, receiverName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hold-receiverPhone">Số điện thoại người nhận *</Label>
                  <Input
                    id="hold-receiverPhone"
                    type="tel"
                    placeholder="Nhập số điện thoại"
                    value={holdFormData.receiverPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setHoldFormData({ ...holdFormData, receiverPhone: digits })
                    }}
                    pattern="^\d{10}$"
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hold-lockerSize">Kích cỡ tủ *</Label>
                  <Select
                    value={holdFormData.lockerSize}
                    onValueChange={(value) => setHoldFormData({ ...holdFormData, lockerSize: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kích cỡ tủ phù hợp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Nhỏ - Phù hợp cho tài liệu, điện thoại</SelectItem>
                      <SelectItem value="medium">Vừa - Phù hợp cho túi xách, giày dép</SelectItem>
                      <SelectItem value="large">Lớn - Phù hợp cho balo, hộp lớn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#2E3192] hover:bg-[#252876] text-white"
                  >
                    {loading ? "Đang xử lý..." : "Xác nhận giữ hàng"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showFingerprintModal} onOpenChange={setShowFingerprintModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[#2E3192]">Xác thực vân tay</DialogTitle>
            <DialogDescription className="text-center pt-4">Mời bạn nhập vân tay ở tủ</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <Fingerprint className="h-24 w-24 text-[#2E3192] animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-32 rounded-full border-4 border-[#2E3192] border-t-transparent animate-spin" />
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground text-center">Đang chờ xác thực vân tay...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Package className="h-5 w-5" />
              {modalTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-green-800 font-medium">
                {modalMessage}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowSuccessModal(false)
                router.push("/customer/history")
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Package className="h-5 w-5" />
              {modalTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-red-800">
                {modalMessage}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
