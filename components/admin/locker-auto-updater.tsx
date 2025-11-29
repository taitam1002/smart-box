"use client"

import { useEffect } from "react"
import { updateLockerTimestamp, updateAllLockersWithDoorField } from "@/lib/firestore-actions"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"

export function LockerAutoUpdater() {
  useEffect(() => {
    // Hàm cập nhật tất cả trường bắt buộc cho tủ
    const updateLockerFields = async () => {
      try {
        const snapshot = await getDocs(collection(db, "lockers"))
        const updatePromises: Promise<void>[] = []
        
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data()
          const updates: any = {}
          let needsUpdate = false
          
          // Kiểm tra và thêm trường door nếu bị thiếu
          if (!data.door || data.door === undefined || data.door === null) {
            updates.door = "closed"
            needsUpdate = true
          }
          
          // Kiểm tra các trường khác nếu cần
          if (!data.status || data.status === undefined || data.status === null) {
            updates.status = "available"
            needsUpdate = true
          }
          
          if (needsUpdate) {
            updates.lastUpdated = new Date()
            const lockerRef = doc(db, "lockers", docSnap.id)
            updatePromises.push(
              updateDoc(lockerRef, updates).catch(err => 
                console.error(`Lỗi cập nhật tủ ${docSnap.id}:`, err)
              )
            )
          }
        })
        
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises)
          console.log(`✅ Đã tự động cập nhật ${updatePromises.length} tủ với các trường bị thiếu`)
        }
      } catch (error) {
        console.error("Lỗi cập nhật trường tủ:", error)
      }
    }

    // Cập nhật thời gian và các trường bắt buộc mỗi 5 phút (300000ms)
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
        
        // Cập nhật các trường bắt buộc (bao gồm door)
        await updateLockerFields()
      } catch (error) {
        console.error("Lỗi cập nhật tủ:", error)
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
        
        // Cập nhật các trường bắt buộc (bao gồm door)
        await updateLockerFields()
      } catch (error) {
        console.error("Lỗi cập nhật tủ ban đầu:", error)
      }
    }
    
    initialUpdate()

    return () => clearInterval(interval)
  }, [])

  return null // Component không render gì
}
