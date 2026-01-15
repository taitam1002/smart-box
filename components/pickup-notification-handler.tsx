"use client"

import { useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { handlePickupFromNotification } from "@/lib/firestore-actions"

/**
 * Component tự động xử lý notification với type "pickup" từ phần cứng
 * Khi phần cứng gửi notification với type "pickup" và có orderId,
 * component này sẽ tự động cập nhật transaction status thành "picked_up"
 */
export function PickupNotificationHandler() {
  useEffect(() => {
    console.log("🔍 Bắt đầu theo dõi notifications với type 'pickup'...")

    // Query để lắng nghe notifications với type "pickup" và chưa được xử lý
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("type", "==", "pickup")
    )

    const processedNotifications = new Set<string>()

    const unsubscribe = onSnapshot(
      notificationsQuery,
      async (snapshot) => {
        // Xử lý các notification mới
        for (const docSnap of snapshot.docs) {
          const notificationId = docSnap.id
          const data = docSnap.data()

          // Bỏ qua nếu đã xử lý
          if (processedNotifications.has(notificationId)) {
            continue
          }

          // Kiểm tra có orderId không
          if (!data.orderId) {
            console.warn(`⚠️ Notification ${notificationId} có type "pickup" nhưng không có orderId`)
            continue
          }

          // Đánh dấu đã xử lý ngay để tránh xử lý nhiều lần
          processedNotifications.add(notificationId)

          try {
            console.log(`📦 Phát hiện notification pickup: ${notificationId}, orderId: ${data.orderId}`)
            
            // Xử lý nhận hàng
            const result = await handlePickupFromNotification(
              data.orderId,
              data.lockerNumber || data.lockerId
            )

            if (result.success) {
              console.log(`✅ Đã xử lý nhận hàng từ notification ${notificationId}: ${result.message}`)
            } else {
              console.warn(`⚠️ Không thể xử lý notification ${notificationId}: ${result.message}`)
              // Xóa khỏi processedNotifications để có thể thử lại nếu cần
              processedNotifications.delete(notificationId)
            }
          } catch (error) {
            console.error(`❌ Lỗi khi xử lý notification ${notificationId}:`, error)
            // Xóa khỏi processedNotifications để có thể thử lại
            processedNotifications.delete(notificationId)
          }
        }

        // Dọn dẹp processedNotifications: xóa các notification không còn trong snapshot
        const currentNotificationIds = new Set(snapshot.docs.map(doc => doc.id))
        for (const notificationId of processedNotifications) {
          if (!currentNotificationIds.has(notificationId)) {
            processedNotifications.delete(notificationId)
          }
        }
      },
      (error) => {
        console.error("❌ Lỗi listener notifications pickup:", error)
      }
    )

    return () => {
      console.log("🛑 Dừng theo dõi notifications pickup")
      unsubscribe()
    }
  }, [])

  // Component này không render gì cả
  return null
}

