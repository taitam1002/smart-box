"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { getCurrentUser, updateUserProfile, logout } from "@/lib/auth"
import { User, Mail, Phone, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CustomerType } from "@/lib/types"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    customerType: "regular" as CustomerType,
  })
  const [loading, setLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      setFormData({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        customerType: currentUser.customerType || "regular",
      })
    }
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updatedUser = await updateUserProfile(user.id, formData)
      if (updatedUser) {
        setUser(updatedUser)
        toast({
          title: "Cập nhật thành công",
          description: "Thông tin tài khoản đã được cập nhật. Thông báo đã được ghi lại trong hệ thống.",
          duration: 3000,
        })
      } else {
        toast({
          title: "Lỗi cập nhật",
          description: "Không thể cập nhật thông tin. Vui lòng thử lại.",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: "Lỗi cập nhật",
        description: "Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await logout()
      toast({
        title: "Đăng xuất thành công",
        description: "Bạn đã đăng xuất khỏi hệ thống. Thông báo đã được ghi lại.",
        duration: 3000,
      })
      router.push("/")
    } catch (error) {
      toast({
        title: "Lỗi đăng xuất",
        description: "Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Thông tin tài khoản</h2>
        <p className="text-muted-foreground mt-1">Quản lý thông tin cá nhân và tùy chỉnh tài khoản</p>
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setFormData({ ...formData, phone: digits })
                  }}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Loại tài khoản</Label>
              <RadioGroup
                value={formData.customerType}
                onValueChange={(value) => setFormData({ ...formData, customerType: value as CustomerType })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="regular" id="profile-regular" />
                  <Label htmlFor="profile-regular" className="cursor-pointer">
                    Người gửi bình thường
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shipper" id="profile-shipper" />
                  <Label htmlFor="profile-shipper" className="cursor-pointer">
                    Shipper
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Thay đổi loại tài khoản sẽ ảnh hưởng đến form gửi hàng của bạn
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#2E3192] hover:bg-[#1E2172]">
              {loading ? "Đang cập nhật..." : "Cập nhật thông tin"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Hành động tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={logoutLoading}>
                <LogOut className="h-4 w-4 mr-2" />
                {logoutLoading ? "Đang đăng xuất..." : "Đăng xuất"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận đăng xuất</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không? 
                  Thông tin đăng xuất sẽ được ghi lại trong hệ thống.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} disabled={logoutLoading}>
                  {logoutLoading ? "Đang đăng xuất..." : "Xác nhận đăng xuất"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
