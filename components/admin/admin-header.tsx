"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getCurrentUser } from "@/lib/auth"
import { NotificationDropdown } from "./notification-dropdown"
import { RealTimeClock } from "./real-time-clock"
import { MobileNavigation } from "./mobile-navigation"

export function AdminHeader() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  return (
    <header className="border-b bg-white px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <MobileNavigation />
        </div>

        {/* Logo and Title - Responsive */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="relative w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0">
            <Image src="/images/hcmute-logo.jpg" alt="HCMUTE" fill className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-xl font-bold text-[#2E3192] truncate">
              HỆ THỐNG QUẢN LÝ TỦ THÔNG MINH
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              HCMUTE Smart Box Management
            </p>
          </div>
        </div>

        {/* Right side - Responsive */}
        <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
          {/* Desktop: Full info */}
          <div className="hidden lg:flex items-center gap-6">
            <RealTimeClock />
            <NotificationDropdown />
            <div className="text-right">
              <p className="text-sm font-medium">Xin chào, {user?.name}</p>
              <p className="text-xs text-muted-foreground">Quản trị viên</p>
            </div>
          </div>

          {/* Tablet: Compact info */}
          <div className="hidden md:flex lg:hidden items-center gap-4">
            <RealTimeClock />
            <NotificationDropdown />
            <div className="text-right">
              <p className="text-sm font-medium truncate max-w-32">{user?.name}</p>
            </div>
          </div>

          {/* Mobile: Minimal info */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationDropdown />
            <div className="text-right">
              <p className="text-xs font-medium truncate max-w-20">{user?.name}</p>
            </div>
          </div>

        </div>
      </div>
    </header>
  )
}
