"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Package, Users, History, BarChart3, Bell, LogOut } from "lucide-react"
import { logout } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useState } from "react"

const menuItems = [
  {
    title: "Tổng quan",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Quản lý tủ",
    href: "/admin/lockers",
    icon: Package,
  },
  {
    title: "Quản lý khách hàng",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Lịch sử giao dịch",
    href: "/admin/transactions",
    icon: History,
  },
  {
    title: "Báo cáo thống kê",
    href: "/admin/statistics",
    icon: BarChart3,
  },
  {
    title: "Thông báo",
    href: "/admin/notifications",
    icon: Bell,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [logoutLoading, setLogoutLoading] = useState(false)

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
    <div className="flex h-screen w-64 flex-col bg-[#2E3192] text-white">
      <div className="p-6">
        <h2 className="text-2xl font-bold">ADMIN PANEL</h2>
        <p className="text-sm text-white/70 mt-1">Smart Box System</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                isActive ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="p-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white/70 hover:bg-white/10 hover:text-white"
              disabled={logoutLoading}
            >
              <LogOut className="h-5 w-5" />
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
      </div>
    </div>
  )
}
