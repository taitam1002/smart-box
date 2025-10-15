"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Home, Package, User, History, AlertCircle, Edit3, Hand, Bell } from "lucide-react"
import { CustomerNotificationDropdown } from "./customer-notification-dropdown"

const navItems = [
  { title: "Trang chủ", href: "/customer/dashboard", icon: Home },
  { title: "Gửi hàng", href: "/customer/send", icon: Package },
  { title: "Nhận hàng", href: "/customer/pickup", icon: Hand },
  { title: "Lịch sử", href: "/customer/history", icon: History },
  { title: "Thông báo", href: "/customer/notifications", icon: Bell },
  { title: "Báo lỗi", href: "/customer/report-error", icon: AlertCircle },
  { title: "Tài khoản", href: "/customer/profile", icon: User },
]

export function CustomerHeader() {
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  return (
    <header className="bg-[#2E3192] text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <Image src="/images/hcmute-logo.jpg" alt="HCMUTE" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SMART BOX</h1>
              <p className="text-xs text-white/70">HCMUTE</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Đổi chuông thành màu trắng rõ ràng hơn */}
            <div className="text-white">
              <CustomerNotificationDropdown />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Xin chào, {user?.name}</p>
              <p className="text-xs text-white/70">{user?.customerType === "shipper" ? "Shipper" : "Người gửi"}</p>
            </div>
            <button
              onClick={() => router.push("/customer/profile")}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-md transition-colors"
              title="Chỉnh sửa tài khoản"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex gap-1 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors",
                  isActive ? "bg-white text-[#2E3192]" : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
