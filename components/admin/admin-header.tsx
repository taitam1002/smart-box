"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getCurrentUser } from "@/lib/auth"
import { NotificationDropdown } from "./notification-dropdown"
import { RealTimeClock } from "./real-time-clock"

export function AdminHeader() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12">
            <Image src="/images/hcmute-logo.jpg" alt="HCMUTE" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2E3192]">HỆ THỐNG QUẢN LÝ TỦ THÔNG MINH</h1>
            <p className="text-sm text-muted-foreground">HCMUTE Smart Box Management</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <RealTimeClock />
          <NotificationDropdown />
          <div className="text-right">
            <p className="text-sm font-medium">Xin chào, {user?.name}</p>
            <p className="text-xs text-muted-foreground">Quản trị viên</p>
          </div>
        </div>
      </div>
    </header>
  )
}
