"use client"

import { useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { autoCleanupDeliveryInfoWithLockerReset, cleanupVerifiedDeliveryInfo, cleanupReceivedDeliveryInfo } from "@/lib/firestore-actions"

/**
 * Component tự động theo dõi delivery_info collection
 * - Đơn giữ hàng (vân tay): Xóa khi có fingerprintData, fingerprintVerified = true, và orderId
 * - Đơn gửi hàng (SMS): Xóa khi receive = true và orderId
 */
export function DeliveryInfoAutoCleanup() {
  useEffect(() => {
    console.log("🔍 Bắt đầu theo dõi delivery_info collection để tự động xóa và reset tủ...")

    // Query cho đơn giữ hàng (deliveryType === "giu")
    const holdDeliveryQuery = query(
      collection(db, "delivery_info"),
      where("deliveryType", "==", "giu")
    )

    // Query cho đơn gửi hàng SMS (deliveryType === "gui")
    const smsDeliveryQuery = query(
      collection(db, "delivery_info"),
      where("deliveryType", "==", "gui")
    )

    const processedDocs = new Set<string>()

    const isFingerprintVerified = (value: any) => {
      if (value === true || value === 1) return true
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase()
        return normalized === "true" || normalized === "1"
      }
      return !!value
    }

    // Listener cho đơn giữ hàng (vân tay)
    const unsubscribeHold = onSnapshot(
      holdDeliveryQuery,
      async (snapshot) => {
        for (const docSnap of snapshot.docs) {
          const docId = docSnap.id
          const data = docSnap.data()

          if (processedDocs.has(docId)) {
            continue
          }

          // Xóa nếu có fingerprintData nhưng chưa xác thực (lỗi timeout)
          if (data.fingerprintData && !isFingerprintVerified(data.fingerprintVerified)) {
            console.log(`📡 Phát hiện fingerprintData trong document ${docId} nhưng chưa xác thực, bắt đầu xử lý...`)
            processedDocs.add(docId)

            try {
              const success = await autoCleanupDeliveryInfoWithLockerReset(docId)
              if (success) {
                console.log(`✅ Đã tự động xóa delivery_info ${docId} và reset tủ thành công`)
              } else {
                processedDocs.delete(docId)
              }
            } catch (error) {
              console.error(`❌ Lỗi khi xử lý delivery_info ${docId}:`, error)
              processedDocs.delete(docId)
            }
          } 
          // ✅ Xóa nếu có fingerprintData, đã xác thực vân tay và có orderId
          else if (data.fingerprintData && isFingerprintVerified(data.fingerprintVerified) && data.orderId) {
            console.log(`🗑️ Phát hiện document ${docId} có fingerprintData, đã xác thực vân tay và có orderId, tiến hành xóa...`)
            processedDocs.add(docId)

            try {
              const success = await cleanupVerifiedDeliveryInfo(docId)
              if (success) {
                console.log(`✅ Đã xóa delivery_info ${docId} sau khi xác thực vân tay thành công`)
              } else {
                processedDocs.delete(docId)
              }
            } catch (error) {
              console.error(`❌ Lỗi xóa delivery_info ${docId}:`, error)
              processedDocs.delete(docId)
            }
          }
        }

        // Dọn dẹp processedDocs
        const currentDocIds = new Set(snapshot.docs.map(doc => doc.id))
        for (const docId of processedDocs) {
          if (!currentDocIds.has(docId)) {
            processedDocs.delete(docId)
          }
        }
      },
      (error) => {
        console.error("❌ Lỗi listener delivery_info (giữ hàng):", error)
      }
    )

    // Listener cho đơn gửi hàng SMS
    const unsubscribeSMS = onSnapshot(
      smsDeliveryQuery,
      async (snapshot) => {
        for (const docSnap of snapshot.docs) {
          const docId = docSnap.id
          const data = docSnap.data()

          if (processedDocs.has(docId)) {
            continue
          }

          // ✅ Chỉ xóa khi receive = true và có orderId
          if (data.receive === true && data.orderId) {
            console.log(`🗑️ Phát hiện document ${docId} đã nhận hàng (receive = true), tiến hành xóa...`)
            processedDocs.add(docId)

            try {
              const success = await cleanupReceivedDeliveryInfo(docId)
              if (success) {
                console.log(`✅ Đã xóa delivery_info ${docId} sau khi nhận hàng thành công`)
              } else {
                processedDocs.delete(docId)
              }
            } catch (error) {
              console.error(`❌ Lỗi xóa delivery_info ${docId}:`, error)
              processedDocs.delete(docId)
            }
          }
        }

        // Dọn dẹp processedDocs
        const currentDocIds = new Set(snapshot.docs.map(doc => doc.id))
        for (const docId of processedDocs) {
          if (!currentDocIds.has(docId)) {
            processedDocs.delete(docId)
          }
        }
      },
      (error) => {
        console.error("❌ Lỗi listener delivery_info (gửi hàng SMS):", error)
      }
    )

    return () => {
      console.log("🛑 Dừng theo dõi delivery_info collection")
      unsubscribeHold()
      unsubscribeSMS()
    }
  }, [])

  // Component này không render gì
  return null
}














