"use client"

import { useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { autoCleanupDeliveryInfoWithLockerReset } from "@/lib/firestore-actions"

/**
 * Component tự động theo dõi delivery_info collection
 * Khi ESP gửi fingerprintData lên, tự động xóa document và reset tủ
 */
export function DeliveryInfoAutoCleanup() {
  useEffect(() => {
    console.log("🔍 Bắt đầu theo dõi delivery_info collection để tự động xóa và reset tủ...")

    // Query chỉ lấy đơn giữ hàng (deliveryType === "giu")
    const deliveryInfoQuery = query(
      collection(db, "delivery_info"),
      where("deliveryType", "==", "giu")
    )

    // Set để theo dõi các document đã xử lý (tránh xử lý nhiều lần)
    const processedDocs = new Set<string>()

    const unsubscribe = onSnapshot(
      deliveryInfoQuery,
      async (snapshot) => {
        // Xử lý các document mới hoặc đã thay đổi
        for (const docSnap of snapshot.docs) {
          const docId = docSnap.id
          const data = docSnap.data()

          // Bỏ qua nếu đã xử lý
          if (processedDocs.has(docId)) {
            continue
          }

          // Kiểm tra nếu document có fingerprintData (ESP đã gửi lên)
          if (data.fingerprintData) {
            console.log(`📡 Phát hiện fingerprintData trong document ${docId}, bắt đầu xử lý...`)
            
            // Đánh dấu đã xử lý ngay để tránh xử lý nhiều lần
            processedDocs.add(docId)

            try {
              // Tự động xóa document và reset tủ
              const success = await autoCleanupDeliveryInfoWithLockerReset(docId)
              
              if (success) {
                console.log(`✅ Đã tự động xóa delivery_info ${docId} và reset tủ thành công`)
              } else {
                console.log(`ℹ️ Document ${docId} không cần xử lý hoặc đã bị xóa`)
                // Xóa khỏi processedDocs để có thể xử lý lại nếu cần
                processedDocs.delete(docId)
              }
            } catch (error) {
              console.error(`❌ Lỗi khi xử lý delivery_info ${docId}:`, error)
              // Xóa khỏi processedDocs để có thể thử lại
              processedDocs.delete(docId)
            }
          }
        }

        // Dọn dẹp processedDocs: xóa các document không còn trong snapshot
        const currentDocIds = new Set(snapshot.docs.map(doc => doc.id))
        for (const docId of processedDocs) {
          if (!currentDocIds.has(docId)) {
            processedDocs.delete(docId)
          }
        }
      },
      (error) => {
        console.error("❌ Lỗi listener delivery_info:", error)
      }
    )

    return () => {
      console.log("🛑 Dừng theo dõi delivery_info collection")
      unsubscribe()
    }
  }, [])

  // Component này không render gì
  return null
}









