"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, Package, Users, History, BarChart3, Bell, AlertTriangle, Menu, LogOut } from "lucide-react"
import { logout } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

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
  {
    title: "Quản lý báo lỗi",
    href: "/admin/error-reports",
    icon: AlertTriangle,
  },
]

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await logout()
      toast({
        title: "Đăng xuất thành công",
        description: "Bạn đã đăng xuất khỏi hệ thống.",
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-[#2E3192] text-white p-0">
        <div className="flex flex-col h-full">
          {/* Header - Fixed */}
          <div className="p-6 border-b border-white/20 flex-shrink-0">
            <h2 className="text-xl font-bold">ADMIN PANEL</h2>
            <p className="text-sm text-white/70 mt-1">Smart Box System</p>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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

          {/* Logout Button - Fixed at bottom */}
          <div className="p-3 flex-shrink-0 border-t border-white/20">
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
      </SheetContent>
    </Sheet>
  )
}
