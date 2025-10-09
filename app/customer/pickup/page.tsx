"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentUser } from "@/lib/auth"
import { getUserTransactions, getLockers, pickupPackage, saveNotification } from "@/lib/firestore-actions"
import { Package, Clock, CheckCircle, Fingerprint, Key } from "lucide-react"
import { toast } from "sonner"

export default function PickupPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [lockers, setLockers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showFingerprintModal, setShowFingerprintModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [pickupCode, setPickupCode] = useState("")

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

    try {
      setLoading(true)
      
      // Tìm order có mã pickupCode phù hợp
      const targetOrder = orders.find(order => 
        order.status === "delivered" && 
        order.transactionType === "send" && 
        order.pickupCode === pickupCode.trim()
      )

      if (!targetOrder) {
        toast.error("Mã lấy hàng không đúng hoặc không tồn tại")
        return
      }

      await pickupPackage(targetOrder.id)
      
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
      toast.success("Đã nhận hàng thành công!")
      
      // Reload data
      const [txs, lockerList] = await Promise.all([
        getUserTransactions(user.id),
        getLockers()
      ])
      setOrders(txs)
      setLockers(lockerList)
      setPickupCode("")
      
    } catch (error) {
      console.error("Lỗi khi nhận hàng:", error)
      toast.error("Có lỗi xảy ra khi nhận hàng")
    } finally {
      setLoading(false)
    }
  }

  const handlePickupByFingerprint = async (order: any) => {
    setSelectedOrder(order)
    setShowFingerprintModal(true)
    
    // Simulate fingerprint scan completion after 3 seconds
    setTimeout(async () => {
      try {
        setLoading(true)
        await pickupPackage(order.id)
        
        // Thông báo cho khách hàng về việc đã nhận hàng (giữ hàng)
        try {
          await saveNotification({
            type: "customer_action",
            message: `Bạn đã nhận hàng giữ thành công từ tủ ${lockers.find(l=>l.id===order.lockerId)?.lockerNumber || order.lockerId}`,
            customerId: user.id,
            orderId: order.id,
            lockerId: order.lockerId,
            isRead: false,
            createdAt: new Date(),
          })
        } catch {}
        
        toast.success("Đã nhận hàng thành công!")
        
        // Reload data
        const [txs, lockerList] = await Promise.all([
          getUserTransactions(user.id),
          getLockers()
        ])
        setOrders(txs)
        setLockers(lockerList)
        
      } catch (error) {
        console.error("Lỗi khi nhận hàng:", error)
        toast.error("Có lỗi xảy ra khi nhận hàng")
      } finally {
        setLoading(false)
        setShowFingerprintModal(false)
        setSelectedOrder(null)
      }
    }, 3000)
  }

  const sendOrders = orders.filter((o) => o.status === "delivered" && o.transactionType === "send")
  const holdOrders = orders.filter((o) => o.status === "delivered" && o.transactionType === "hold")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Nhận hàng</h2>
        <p className="text-muted-foreground">Nhận hàng từ tủ thông minh</p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Gửi hàng (Mã số)
          </TabsTrigger>
          <TabsTrigger value="hold" className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            Giữ hàng (Vân tay)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
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
                    onChange={(e) => setPickupCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg font-mono"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !pickupCode.trim()}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Đang xử lý..." : "Xác nhận lấy hàng"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {sendOrders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Đơn hàng gửi chờ nhận</h3>
              {sendOrders.map((order) => {
                const locker = lockers.find((l) => l.id === order.lockerId)
                return (
                  <Card key={order.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Từ: {order.senderName}</p>
                          <p className="text-sm text-muted-foreground">
                            Tủ: {locker?.lockerNumber} • {order.receiverPhone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-orange-700">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Chờ nhận</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hold" className="space-y-4">
          {holdOrders.length > 0 ? (
            <div className="grid gap-4">
              {holdOrders.map((order) => {
                const locker = lockers.find((l) => l.id === order.lockerId)
                return (
                  <Card key={order.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Đơn hàng #{order.orderCode || order.id.slice(-8)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Người gửi</Label>
                          <p className="font-medium">{order.senderName}</p>
                          <p className="text-sm text-muted-foreground">{order.senderPhone}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Người nhận</Label>
                          <p className="font-medium">{order.receiverName}</p>
                          <p className="text-sm text-muted-foreground">{order.receiverPhone}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Tủ số</Label>
                          <p className="font-medium">{locker?.lockerNumber || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Thời gian gửi</Label>
                          <p className="text-sm">
                            {new Date(order.createdAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-700">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Chờ nhận hàng</span>
                        </div>
                        <Button 
                          onClick={() => handlePickupByFingerprint(order)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Fingerprint className="h-4 w-4 mr-2" />
                          Nhận hàng
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Không có hàng giữ chờ nhận</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Fingerprint Modal */}
      <Dialog open={showFingerprintModal} onOpenChange={setShowFingerprintModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Xác thực vân tay
            </DialogTitle>
            <DialogDescription>
              Đang quét vân tay để xác thực nhận hàng...
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#2E3192] mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Vui lòng đặt ngón tay lên cảm biến vân tay
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
