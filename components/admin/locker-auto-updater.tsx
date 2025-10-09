"use client"

import { useEffect } from "react"
import { updateLockerTimestamp } from "@/lib/firestore-actions"

export function LockerAutoUpdater() {
  useEffect(() => {
    // Cập nhật thời gian tủ mỗi 5 phút (300000ms)
    const interval = setInterval(async () => {
      try {
        // Lấy danh sách tất cả tủ và cập nhật thời gian
        const { getLockers } = await import("@/lib/firestore-actions")
        const lockers = await getLockers()
        
        // Cập nhật thời gian cho tất cả tủ
        const updatePromises = lockers.map(locker => 
          updateLockerTimestamp(locker.id).catch(error => 
            console.error(`Lỗi cập nhật tủ ${locker.id}:`, error)
          )
        )
        
        await Promise.all(updatePromises)
        console.log(`🕐 Đã cập nhật thời gian cho ${lockers.length} tủ`)
      } catch (error) {
        console.error("Lỗi cập nhật thời gian tủ:", error)
      }
    }, 5 * 60 * 1000) // 5 phút

    // Cập nhật ngay lập tức khi component mount
    const initialUpdate = async () => {
      try {
        const { getLockers } = await import("@/lib/firestore-actions")
        const lockers = await getLockers()
        
        const updatePromises = lockers.map(locker => 
          updateLockerTimestamp(locker.id).catch(error => 
            console.error(`Lỗi cập nhật tủ ${locker.id}:`, error)
          )
        )
        
        await Promise.all(updatePromises)
        console.log(`🕐 Cập nhật thời gian ban đầu cho ${lockers.length} tủ`)
      } catch (error) {
        console.error("Lỗi cập nhật thời gian tủ ban đầu:", error)
      }
    }
    
    initialUpdate()

    return () => clearInterval(interval)
  }, [])

  return null // Component không render gì
}
