"use client"

import { useEffect } from "react"
import { fixLegacyNotifications } from "@/lib/firestore-actions"

export function NotificationFixer() {
  useEffect(() => {
    // Chỉ chạy một lần khi component mount
    const fixNotifications = async () => {
      try {
        await fixLegacyNotifications()
        console.log("✅ Đã sửa xong thông báo cũ")
      } catch (error) {
        console.error("Lỗi sửa thông báo cũ:", error)
      }
    }

    fixNotifications()
  }, [])

  return null // Component không render gì
}
