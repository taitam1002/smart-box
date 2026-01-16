"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentUser } from "@/lib/auth"
import { saveTransaction, getLockers, updateLockerStatus, saveNotification, findUserByEmail, saveDeliveryInfo, updateDeliveryInfo, deleteDeliveryInfo, cleanupDeliveryInfo, autoCleanupDeliveryInfoWithLockerReset, cleanupVerifiedDeliveryInfo } from "@/lib/firestore-actions"
import { SMSService } from "@/lib/sms-service"
import { Package, Archive, Fingerprint } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, Unsubscribe, getDoc, updateDoc, deleteDoc } from "firebase/firestore"

export default function SendPackagePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showFingerprintModal, setShowFingerprintModal] = useState(false)
  const [lockers, setLockers] = useState<any[]>([])
  const [reservedLockerState, setReservedLockerState] = useState<{ candidates: string[]; docId: string | null } | null>(null)
  const reservedLockerRef = useRef<{ candidates: string[]; docId: string | null } | null>(null)

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalMessage, setModalMessage] = useState("")
  const [modalTitle, setModalTitle] = useState("")

  // Modal cho thông báo thông tin trùng
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)

  // State để control tab
  const [activeTab, setActiveTab] = useState("send")

  const [sendFormData, setSendFormData] = useState({
    receiverName: "",
    receiverPhone: "",
    orderCode: "",
    lockerSize: "",
  })

  const [holdFormData, setHoldFormData] = useState({
    lockerSize: "",
  })

  // State để lưu deliveryInfoId và unsubscribe listener
  const [currentDeliveryInfoId, setCurrentDeliveryInfoId] = useState<string | null>(null)
  const [fingerprintUnsubscribe, setFingerprintUnsubscribe] = useState<Unsubscribe | null>(null)
  const [fingerprintTimeout, setFingerprintTimeout] = useState<NodeJS.Timeout | null>(null)
  // State để hiển thị trạng thái "đã nhận vân tay" trong modal
  const [fingerprintReceived, setFingerprintReceived] = useState(false)
  // State để lưu số tủ đang xử lý (để hiển thị trong modal)
  const [currentLockerNumber, setCurrentLockerNumber] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Load lockers from Firestore
    const loadLockers = async () => {
      try {
        const lockersData = await getLockers()
        setLockers(lockersData)
        console.log("[Send] Loaded lockers:", lockersData)
        // Debug: Hiển thị thông tin tủ
        const availableLockers = lockersData.filter(l => l.status === "available")
        console.log("🔍 Tủ khả dụng:", availableLockers.map(l => `${l.lockerNumber} (${l.size})`))
      } catch (error) {
        console.error("Lỗi tải danh sách tủ:", error)
      }
    }

    loadLockers()
  }, [])

  // Cleanup listener và timeout khi component unmount hoặc khi đóng modal
  useEffect(() => {
    return () => {
      if (fingerprintUnsubscribe) {
        fingerprintUnsubscribe()
        setFingerprintUnsubscribe(null)
      }
      if (fingerprintTimeout) {
        clearTimeout(fingerprintTimeout)
        setFingerprintTimeout(null)
      }
    }
  }, [fingerprintUnsubscribe, fingerprintTimeout])

  // Hàm chuẩn hóa giá trị fingerprintVerified từ thiết bị
  const isFingerprintVerified = (value: any) => {
    if (value === true || value === 1) return true
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase()
      return normalized === "true" || normalized === "1"
    }
    // Fallback: mọi giá trị truthy khác cũng coi như đã xác thực
    return !!value
  }

  // Kiểm tra định kỳ fingerprintVerified khi modal đang mở (backup cho listener)
  // ✅ SỬA: Cập nhật UI ngay khi phát hiện fingerprintVerified = true
  useEffect(() => {
    if (!showFingerprintModal || !currentDeliveryInfoId) {
      return
    }

    console.log("🔍 Bắt đầu kiểm tra định kỳ fingerprintVerified (backup)...")
    let alreadyDetected = false

    const checkInterval = setInterval(async () => {
      if (alreadyDetected) return

      try {
        const deliveryInfoRef = doc(db, "delivery_info", currentDeliveryInfoId)
        const snapshot = await getDoc(deliveryInfoRef)
        if (snapshot.exists()) {
          const data = snapshot.data()
          if (isFingerprintVerified(data.fingerprintVerified)) {
            console.log("✅ useEffect backup phát hiện fingerprintVerified = true!")
            console.log("📋 Data hiện tại:", {
              orderId: data.orderId,
              fingerprintVerified: data.fingerprintVerified,
              deliveryType: data.deliveryType
            })
            alreadyDetected = true
            // ✅ QUAN TRỌNG: Cập nhật UI ngay lập tức
            setFingerprintReceived(true)
            // QUAN TRỌNG: KHÔNG đóng modal ở đây - để listener chính xử lý
            // Listener chính sẽ tạo transaction và gắn orderId
          }
        }
      } catch (e) {
        console.error("Lỗi kiểm tra trong useEffect backup:", e)
      }
    }, 500) // Kiểm tra mỗi 0.5 giây

    return () => {
      clearInterval(checkInterval)
    }
  }, [showFingerprintModal, currentDeliveryInfoId])

  // Helper functions for modals
  const showSuccess = (title: string, message: string) => {
    setModalTitle(title)
    setModalMessage(message)
    setShowSuccessModal(true)
  }

  const showError = (title: string, message: string) => {
    setModalTitle(title)
    setModalMessage(message)
    setShowErrorModal(true)
  }

  const releaseReservedLocker = async () => {
    const state = reservedLockerRef.current || reservedLockerState
    if (!state) return
    const { candidates, docId } = state
    const releaseCandidates = docId
      ? [docId, ...candidates.filter((id) => id !== docId)]
      : candidates

    for (const lockerDocId of releaseCandidates) {
      try {
        await updateLockerStatus(lockerDocId, "available")
        console.log("🔓 Đã trả lại tủ sau khi hủy giữ:", lockerDocId)
        setReservedLockerState(null)
        reservedLockerRef.current = null
        return
      } catch (error) {
        console.error("❌ Lỗi trả lại tủ:", lockerDocId, error)
      }
    }
  }

  const handleSendPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Reload danh sách tủ để đảm bảo có dữ liệu mới nhất
      const freshLockers = await getLockers()
      setLockers(freshLockers)

      // Kiểm tra xem có tủ trống không
      const availableLockers = freshLockers.filter((l) => (l.status || "").trim() === "available")
      if (availableLockers.length === 0) {
        setLoading(false)
        showError("Lỗi", "Hiện tại không còn tủ trống. Vui lòng thử lại sau.")
        return
      }

      // Kiểm tra trùng lặp: chỉ cảnh báo khi tên VÀ số điện thoại đều trùng
      const normalizedReceiverName = sendFormData.receiverName.trim().toLowerCase()
      const normalizedSenderName = (user?.name || "").trim().toLowerCase()
      const normalizedReceiverPhone = SMSService.normalizePhone(sendFormData.receiverPhone)
      const normalizedSenderPhone = user?.phone ? SMSService.normalizePhone(user.phone) : ""

      const isNameDuplicate = normalizedReceiverName !== "" && normalizedReceiverName === normalizedSenderName
      const isPhoneDuplicate = normalizedReceiverPhone !== "" && normalizedReceiverPhone === normalizedSenderPhone

      if (isNameDuplicate && isPhoneDuplicate) {
        setLoading(false)
        setShowDuplicateModal(true)
        return
      }
      // Đảm bảo có senderId
      let senderId = user?.id
      if (!senderId && user?.email) {
        const found = await findUserByEmail(user.email)
        if (found) {
          senderId = found.id
          const normalized = { ...user, id: found.id }
          setUser(normalized)
          if (typeof window !== "undefined") {
            localStorage.setItem("currentUser", JSON.stringify(normalized))
          }
        }
      }
      if (!senderId) {
        throw new Error("Không xác định được tài khoản. Vui lòng đăng nhập lại.")
      }

      // Tìm tủ khả dụng theo kích cỡ được chọn (sử dụng freshLockers)
      let availableLocker = null

      if (sendFormData.lockerSize) {
        console.log(`🔍 Tìm tủ kích cỡ: ${sendFormData.lockerSize}`)
        // Tìm tủ có kích cỡ phù hợp
        availableLocker = freshLockers.find((l) =>
          (l.status || "").trim() === "available" &&
          l.size === sendFormData.lockerSize
        )

        if (availableLocker) {
          console.log(`✅ Tìm thấy tủ phù hợp: ${availableLocker.lockerNumber} (${availableLocker.size})`)
        } else {
          console.log(`❌ Không có tủ ${sendFormData.lockerSize} trống`)
        }
      } else {
        // Nếu không chọn kích cỡ, tìm tủ bất kỳ
        availableLocker = freshLockers.find((l) => (l.status || "").trim() === "available")
        console.log(`🔍 Tìm tủ bất kỳ: ${availableLocker?.lockerNumber} (${availableLocker?.size})`)
      }
      if (availableLocker) {
        // Tạo mã 6 số cho việc lấy hàng
        const pickupCode = SMSService.generateCode()

        const newOrder: any = {
          senderId,
          senderName: user.name,
          senderPhone: user.phone,
          senderType: user.customerType || "regular",
          receiverName: sendFormData.receiverName,
          receiverPhone: SMSService.normalizePhone(sendFormData.receiverPhone),
          lockerId: availableLocker.id,
          status: "delivered" as const,
          createdAt: new Date(),
          deliveredAt: new Date(),
          pickupCode,
          transactionType: "send" as const,
          fingerprintVerified: false,
          smsSent: false,
        }
        if (user.customerType === "shipper" && sendFormData.orderCode) {
          newOrder.orderCode = sendFormData.orderCode
        }

        // Lưu giao dịch vào Firestore
        const newOrderId = await saveTransaction(newOrder)

        // CẬP NHẬT transaction để có field orderId (chính là document ID)
        try {
          const transactionRef = doc(db, "transactions", newOrderId)
          await updateDoc(transactionRef, { orderId: newOrderId })
          console.log("✅ Đã gắn orderId vào transaction (gửi hàng):", newOrderId)
        } catch (updateTxError) {
          console.error("❌ Lỗi gắn orderId vào transaction:", updateTxError)
        }

        // Lưu thông tin giao hàng (số điện thoại, loại tủ, mã tủ, tên) vào collection riêng
        // KHÔNG lưu accessCode vào delivery_info ngay - chỉ lưu sau khi SMS thành công
        let deliveryInfoId: string | null = null
        try {
          const deliveryInfoData = {
            receiverPhone: SMSService.normalizePhone(sendFormData.receiverPhone),
            receiverName: sendFormData.receiverName,
            lockerSize: availableLocker.size,
            lockerNumber: availableLocker.lockerNumber,
            lockerId: availableLocker.id,
            senderId,
            orderId: newOrderId,
            // KHÔNG lưu accessCode vào delivery_info - chỉ lưu sau khi SMS thành công
            smsSent: false, // Đơn gửi hàng chỉ cần SMS
            deliveryType: "gui" as const, // Gửi hàng
            createdAt: new Date(),
          }
          console.log("📦 Lưu delivery_info (gửi hàng):", deliveryInfoData)
          deliveryInfoId = await saveDeliveryInfo(deliveryInfoData)
          console.log("✅ Đã lưu delivery_info với ID:", deliveryInfoId)
        } catch (e) {
          console.error("Lỗi lưu thông tin giao hàng:", e)
        }

        // Cập nhật trạng thái tủ (không chặn luồng nếu lỗi)
        try {
          await updateLockerStatus(availableLocker.id, "occupied", newOrderId)
        } catch (e) {
          console.error("Lỗi cập nhật trạng thái tủ:", e)
        }

        // Gửi SMS cho người nhận (nếu cấu hình) – KHÔNG ảnh hưởng tới việc mở cửa tủ
        let smsSent = false
        try {
          const isShipper = user.customerType === "shipper"
          smsSent = await SMSService.sendPickupCode(
            sendFormData.receiverPhone,
            sendFormData.receiverName,
            user.name,
            pickupCode,
            sendFormData.orderCode,
            isShipper
          )
          if (smsSent && deliveryInfoId) {
            // CHỈ lưu accessCode vào delivery_info SAU KHI SMS thành công
            try {
              await updateDeliveryInfo(deliveryInfoId, {
                accessCode: pickupCode
              })
              console.log("✅ Đã cập nhật accessCode vào delivery_info sau khi SMS thành công")
            } catch (e) {
              console.error("Lỗi cập nhật accessCode vào delivery_info:", e)
            }
          } else if (!smsSent) {
            console.warn("⚠️ SMS không gửi được, KHÔNG lưu accessCode vào delivery_info")
          }
        } catch (e) {
          console.error("Lỗi gửi SMS:", e)
          smsSent = false
        }

        // Luôn mở cửa tủ sau khi tạo đơn gửi hàng thành công (kể cả khi SMS lỗi)
        const lockerDocId = availableLocker.lockerNumber || availableLocker.id
        try {
          const lockerRef = doc(db, "lockers", lockerDocId)
          await updateDoc(lockerRef, {
            door: "open",
            lastUpdated: new Date()
          })
          console.log("✅ Đã mở cửa tủ sau khi tạo đơn gửi hàng:", lockerDocId)
        } catch (doorError) {
          console.error("Lỗi cập nhật trạng thái cửa tủ:", doorError)
        }

        // Gửi thông báo cho admin (không chặn luồng nếu lỗi)
        try {
          await saveNotification({
            type: "customer_action",
            message: `${user.name} đã gửi hàng vào tủ ${availableLocker.lockerNumber}`,
            lockerId: availableLocker.id,
            // Không có customerId để admin có thể thấy
            orderId: newOrderId,
            isRead: false,
            createdAt: new Date(),
          })
        } catch (e) {
          console.error("Lỗi gửi thông báo:", e)
        }

        // Gửi thông báo cho chính khách hàng
        try {
          const notificationMessage = smsSent
            ? `Bạn đã gửi hàng thành công vào tủ ${availableLocker.lockerNumber}. Mã lấy hàng đã được gửi cho người nhận`
            : `Bạn đã gửi hàng thành công vào tủ ${availableLocker.lockerNumber}`

          await saveNotification({
            type: "customer_action",
            message: notificationMessage,
            customerId: senderId,
            lockerId: availableLocker.id,
            orderId: newOrderId,
            isRead: false,
            createdAt: new Date(),
          })
        } catch (e) {
          console.error("Lỗi tạo thông báo cho khách hàng:", e)
        }

        const sizeLabel = availableLocker.size === "small" ? "Nhỏ" : availableLocker.size === "medium" ? "Vừa" : "Lớn"

        // Hiển thị thông báo khác nhau tùy theo kết quả gửi SMS
        if (smsSent) {
          showSuccess(
            "Gửi hàng thành công!",
            `Tủ số: ${availableLocker.lockerNumber}\nKích cỡ: ${sizeLabel}\n\nMã lấy hàng đã được gửi qua SMS.`
          )
        } else {
          showSuccess(
            "Gửi hàng thành công!",
            `Tủ số: ${availableLocker.lockerNumber}\nKích cỡ: ${sizeLabel}\nMã OTP sẽ được gửi về cho người nhận.`
          )
        }
      } else {
        if (sendFormData.lockerSize) {
          const sizeLabel = sendFormData.lockerSize === "small" ? "Nhỏ" : sendFormData.lockerSize === "medium" ? "Vừa" : "Lớn"

          // Hiển thị danh sách tủ khả dụng
          const availableLockersList = freshLockers.filter(l => (l.status || "").trim() === "available")
          const availableSizes = [...new Set(availableLockersList.map(l => l.size))]
          const sizeLabels = availableSizes.map(size =>
            size === "small" ? "Nhỏ" : size === "medium" ? "Vừa" : "Lớn"
          )

          if (availableSizes.length > 0) {
            showError("Lỗi", `Hiện tại tủ ${sizeLabel} đã hết. Mời bạn chọn loại tủ khác để thay thế.\n\nTủ khả dụng: ${sizeLabels.join(", ")}`)
          } else {
            showError("Lỗi", "Hiện tại không còn tủ trống. Vui lòng thử lại sau.")
          }
        } else {
          showError("Lỗi", "Không có tủ trống. Vui lòng thử lại sau.")
        }
      }
    } catch (error: any) {
      console.error("Lỗi gửi hàng:", error)
      showError("Lỗi", error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  const handleHoldPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Reload danh sách tủ để đảm bảo có dữ liệu mới nhất
      const freshLockers = await getLockers()
      setLockers(freshLockers)

      // Kiểm tra xem có tủ trống không
      const availableLockers = freshLockers.filter((l) => (l.status || "").trim() === "available")
      if (availableLockers.length === 0) {
        setLoading(false)
        showError("Lỗi", "Hiện tại không còn tủ trống. Vui lòng thử lại sau.")
        return
      }

      // Tìm tủ khả dụng theo kích cỡ được chọn (sử dụng freshLockers)
      let availableLocker = null

      if (holdFormData.lockerSize) {
        // Tìm tủ có kích cỡ phù hợp
        availableLocker = freshLockers.find((l) =>
          (l.status || "").trim() === "available" &&
          l.size === holdFormData.lockerSize
        )
      } else {
        // Nếu không chọn kích cỡ, tìm tủ bất kỳ
        availableLocker = freshLockers.find((l) => (l.status || "").trim() === "available")
      }
      if (availableLocker) {
        console.log("🔍 Tìm thấy tủ khả dụng:", {
          id: availableLocker.id,
          lockerNumber: availableLocker.lockerNumber,
          size: availableLocker.size,
          status: availableLocker.status
        })

        // Đảm bảo có senderId trước khi tạo document
        let senderId2 = user?.id
        if (!senderId2 && user?.email) {
          try {
            const found = await findUserByEmail(user.email)
            if (found) {
              senderId2 = found.id
              const normalized = { ...user, id: found.id }
              setUser(normalized)
              if (typeof window !== "undefined") {
                localStorage.setItem("currentUser", JSON.stringify(normalized))
              }
            }
          } catch (e) {
            console.error("Lỗi tìm user:", e)
          }
        }
        if (!senderId2) {
          setLoading(false)
          showError("Lỗi", "Không xác định được tài khoản. Vui lòng đăng nhập lại.")
          return
        }

        const lockerDocCandidates = Array.from(
          new Set(
            [availableLocker.id, availableLocker.lockerNumber].filter(
              (val): val is string => Boolean(val)
            )
          )
        )
        let reservedLockerDocId: string | null = null

        const reserveLocker = async () => {
          for (const lockerDocId of lockerDocCandidates) {
            try {
              await updateLockerStatus(lockerDocId, "occupied", undefined, { doorState: "closed" })
              reservedLockerDocId = lockerDocId
              console.log("✅ Đã đặt tủ occupied trước khi xác thực:", lockerDocId)
              return
            } catch (error) {
              console.error("❌ Không thể đặt tủ:", lockerDocId, error)
            }
          }
          throw new Error("Không thể cập nhật trạng thái tủ. Vui lòng thử lại.")
        }

        try {
          await reserveLocker()
          const state = { candidates: lockerDocCandidates, docId: reservedLockerDocId }
          setReservedLockerState(state)
          reservedLockerRef.current = state

          // Đóng cửa tủ trong lúc chờ xác thực vân tay
          const lockerIdToClose = reservedLockerDocId || lockerDocCandidates[0]
          if (lockerIdToClose) {
            try {
              const lockerRef = doc(db, "lockers", lockerIdToClose)
              await updateDoc(lockerRef, {
                door: "closed",
                lastUpdated: new Date()
              })
              console.log("🔒 Đã đóng cửa tủ khi chờ xác thực:", lockerIdToClose)
            } catch (closeError) {
              console.error("❌ Không thể đóng cửa tủ khi chờ xác thực:", closeError)
            }
          }
        } catch (reserveError: any) {
          setLoading(false)
          showError("Lỗi", reserveError?.message || "Không thể cập nhật trạng thái tủ.")
          return
        }

        // Kiểm tra nếu đã có listener đang chạy
        if (fingerprintUnsubscribe) {
          console.log("⚠️ Đã có listener đang chạy, cleanup trước")
          fingerprintUnsubscribe()
          setFingerprintUnsubscribe(null)
        }

        // TẠO TRANSACTION NGAY khi user bấm giữ hàng (không đợi fingerprint)
        // Fingerprint chỉ để xác thực danh tính, không ảnh hưởng đến việc tạo đơn
        let newOrderId: string
        try {
          const newOrder: any = {
            senderId: senderId2,
            senderName: user.name,
            senderPhone: user.phone,
            senderType: user.customerType || "regular",
            receiverName: user.name,
            receiverPhone: SMSService.normalizePhone(user.phone),
            lockerId: availableLocker.id,
            status: "delivered" as const,
            createdAt: new Date(),
            deliveredAt: new Date(),
            transactionType: "hold" as const,
            fingerprintVerified: false,
          }
          console.log("📦 Tạo transaction giữ hàng NGAY:", newOrder)
          newOrderId = await saveTransaction(newOrder)
          console.log("✅ Đã tạo transaction, ID:", newOrderId)

          // CẬP NHẬT transaction để có field orderId (chính là document ID)
          try {
            const transactionRef = doc(db, "transactions", newOrderId)
            await updateDoc(transactionRef, { orderId: newOrderId })
            console.log("✅ Đã gắn orderId vào transaction:", newOrderId)
          } catch (updateTxError) {
            console.error("❌ Lỗi gắn orderId vào transaction:", updateTxError)
          }
        } catch (txError) {
          console.error("❌ Lỗi tạo transaction:", txError)
          setLoading(false)
          await releaseReservedLocker()
          showError("Lỗi", "Không thể tạo giao dịch. Vui lòng thử lại.")
          return
        }

        // Cập nhật tủ với orderId NGAY
        try {
          const primaryLockerId = reservedLockerDocId || lockerDocCandidates[0]
          await updateLockerStatus(primaryLockerId, "occupied", newOrderId, { doorState: "closed" })
          console.log("✅ Đã gắn orderId vào tủ:", primaryLockerId, "orderId:", newOrderId)
        } catch (lockerError) {
          console.error("❌ Lỗi gắn orderId vào tủ:", lockerError)
        }

        // Tạo delivery_info với orderId có sẵn
        let deliveryInfoId: string | null = null
        try {
          const deliveryInfoData = {
            receiverPhone: SMSService.normalizePhone(user.phone),
            receiverName: user.name,
            lockerSize: availableLocker.size,
            lockerNumber: availableLocker.lockerNumber,
            lockerId: availableLocker.id,
            senderId: senderId2,
            orderId: newOrderId, // orderId có sẵn ngay từ đầu
            fingerprintVerified: false, // Đợi fingerprint xác thực
            deliveryType: "giu" as const,
            createdAt: new Date(),
          }
          console.log("📦 Lưu delivery_info với orderId có sẵn:", deliveryInfoData)
          deliveryInfoId = await saveDeliveryInfo(deliveryInfoData)
          console.log("✅ Đã tạo delivery_info với orderId:", newOrderId, "deliveryInfoId:", deliveryInfoId)
        } catch (e) {
          console.error("Lỗi tạo delivery_info:", e)
          // Không return - transaction đã được tạo, chỉ log lỗi
        }

        // Lưu deliveryInfoId để theo dõi
        setCurrentDeliveryInfoId(deliveryInfoId)
        setCurrentLockerNumber(availableLocker.lockerNumber) // Lưu số tủ để hiển thị
        setLoading(false)
        setFingerprintReceived(false) // Reset state khi mở modal mới
        setShowFingerprintModal(true)

        // ✅ Bỏ thông báo "đang xác nhận giữ hàng" - chỉ thông báo khi thành công

        // Tạo real-time listener để theo dõi trạng thái vân tay
        // ✅ QUAN TRỌNG: Kiểm tra deliveryInfoId trước khi tạo listener
        if (!deliveryInfoId) {
          console.error("❌ deliveryInfoId là null, không thể tạo listener!")
          setLoading(false)
          setShowFingerprintModal(false)
          showError("Lỗi", "Không thể tạo delivery_info. Vui lòng thử lại.")
          return
        }
        
        const deliveryInfoRef = doc(db, "delivery_info", deliveryInfoId)
        console.log("🔍 Tạo listener cho deliveryInfoId:", deliveryInfoId)

        // Flag để tránh xử lý nhiều lần
        let isProcessing = false
        let pollIntervalId: NodeJS.Timeout | null = null

        // Hàm xử lý khi phát hiện vân tay đã được xác thực
        // Transaction đã được tạo sẵn với orderId, chỉ cần cập nhật trạng thái
        const handleFingerprintVerified = async (unsubscribeFn: Unsubscribe) => {
          // Tránh xử lý nhiều lần
          if (isProcessing) {
            console.log("⚠️ Đang xử lý rồi, bỏ qua...")
            return
          }
          isProcessing = true

          console.log("✅ Vân tay đã được xác thực!")
          console.log("🔍 deliveryInfoId:", deliveryInfoId)
          console.log("🔍 newOrderId:", newOrderId)

          // ✅ Cập nhật UI để hiển thị "đã nhận vân tay" TRƯỚC khi đóng modal
          setFingerprintReceived(true)
          
          // Force update UI bằng cách set state
          setLoading(false)
          
          // Đợi một chút để người dùng thấy trạng thái "đã nhận vân tay"
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // Sau đó mới đóng modal
          setShowFingerprintModal(false)
          setFingerprintReceived(false) // Reset state

          // Dừng polling nếu có
          if (pollIntervalId) {
            clearInterval(pollIntervalId)
            pollIntervalId = null
          }

          // Dừng listener ngay lập tức
          unsubscribeFn()
          setFingerprintUnsubscribe(null)
          setCurrentDeliveryInfoId(null)

          // Hủy timeout vì đã nhận được vân tay
          const currentTimeout = fingerprintTimeout
          if (currentTimeout) {
            clearTimeout(currentTimeout)
            setFingerprintTimeout(null)
          }

          try {
            // Cập nhật fingerprintVerified = true cho delivery_info
            if (deliveryInfoId) {
              try {
                await updateDeliveryInfo(deliveryInfoId, {
                  fingerprintVerified: true,
                })
                console.log("✅ Đã cập nhật fingerprintVerified = true cho delivery_info")
              } catch (e) {
                console.error("Lỗi cập nhật fingerprintVerified cho delivery_info:", e)
              }
            }

            // ✅ QUAN TRỌNG: Đảm bảo tủ ở trạng thái "occupied" và mở cửa
            try {
              const primaryLockerId = reservedLockerDocId || lockerDocCandidates[0]
              const lockerRef = doc(db, "lockers", primaryLockerId)
              
              // Kiểm tra trạng thái hiện tại của tủ
              const lockerSnap = await getDoc(lockerRef)
              if (lockerSnap.exists()) {
                const lockerData = lockerSnap.data()
                console.log("🔍 Trạng thái tủ hiện tại:", lockerData.status, "currentOrderId:", lockerData.currentOrderId)
                
                // Nếu tủ đã bị reset về "available" (do race condition), đặt lại về "occupied"
                if (lockerData.status === "available" || lockerData.currentOrderId !== newOrderId) {
                  console.log("⚠️ Phát hiện tủ đã bị reset về available hoặc currentOrderId không khớp, đặt lại về occupied")
                  await updateLockerStatus(primaryLockerId, "occupied", newOrderId, { doorState: "open" })
                  console.log("✅ Đã đặt lại tủ về occupied và mở cửa:", primaryLockerId)
                } else {
                  // Tủ đã ở trạng thái occupied, chỉ cần mở cửa
                  await updateDoc(lockerRef, {
                    door: "open",
                    lastUpdated: new Date()
                  })
                  console.log("✅ Đã mở cửa tủ (tủ đã ở trạng thái occupied):", primaryLockerId)
                }
              } else {
                // Nếu không tìm thấy tủ, thử đặt lại về occupied
                console.log("⚠️ Không tìm thấy tủ, thử đặt lại về occupied")
                await updateLockerStatus(primaryLockerId, "occupied", newOrderId, { doorState: "open" })
                console.log("✅ Đã đặt lại tủ về occupied và mở cửa:", primaryLockerId)
              }
              
              setReservedLockerState(null)
              reservedLockerRef.current = null
            } catch (doorError) {
              console.error("❌ Lỗi mở cửa tủ:", doorError)
              // Thử lại với updateLockerStatus nếu updateDoc thất bại
              try {
                const primaryLockerId = reservedLockerDocId || lockerDocCandidates[0]
                await updateLockerStatus(primaryLockerId, "occupied", newOrderId, { doorState: "open" })
                console.log("✅ Đã sửa lại tủ bằng updateLockerStatus:", primaryLockerId)
              } catch (retryError) {
                console.error("❌ Lỗi retry mở cửa tủ:", retryError)
              }
            }

            // Gửi thông báo cho admin
            try {
              await saveNotification({
                type: "customer_action",
                message: `${user.name} đã xác thực vân tay và giữ hàng tại tủ ${availableLocker.lockerNumber}`,
                lockerId: availableLocker.id,
                orderId: newOrderId,
                isRead: false,
                createdAt: new Date(),
              })
            } catch (e) {
              console.error("Lỗi gửi thông báo:", e)
            }

            // ✅ Gửi thông báo cho chính khách hàng khi giữ hàng thành công
            try {
              // QUAN TRỌNG: Notification dropdown query theo currentUser.id và cả ID từ email
              // Nên cần gửi notification cho CẢ HAI ID để đảm bảo hiển thị
              const customerIds = new Set<string>()
              if (user?.id) customerIds.add(user.id)
              if (senderId2) customerIds.add(senderId2)
              
              console.log("🔍 Debug thông báo giữ hàng:", {
                user_id: user?.id,
                senderId2: senderId2,
                customerIds: Array.from(customerIds),
                lockerNumber: availableLocker.lockerNumber
              })
              
              // Gửi notification cho tất cả các ID có thể
              const notificationPromises = Array.from(customerIds).map(async (customerId) => {
                const notificationData = {
                  type: "customer_action" as const,
                  message: `Bạn đã giữ hàng thành công tại tủ ${availableLocker.lockerNumber}`,
                  customerId: customerId,
                  lockerId: availableLocker.id,
                  orderId: newOrderId,
                  isRead: false,
                  createdAt: new Date(),
                }
                console.log("📤 Gửi thông báo giữ hàng cho customerId:", customerId)
                return saveNotification(notificationData)
              })
              
              await Promise.all(notificationPromises)
              console.log("✅ Đã gửi thông báo giữ hàng cho tất cả customerIds:", Array.from(customerIds))
            } catch (e) {
              console.error("❌ Lỗi gửi thông báo giữ hàng cho khách hàng:", e)
            }

            // ✅ Xóa delivery_info sau khi đã xử lý xong (có fingerprintData, fingerprintVerified = true, và orderId)
            // Đợi một chút để đảm bảo orderId đã được cập nhật vào delivery_info
            if (deliveryInfoId) {
              try {
                await new Promise(resolve => setTimeout(resolve, 1000))
                
                // Kiểm tra lại để đảm bảo có fingerprintData và orderId
                const deliveryInfoRef = doc(db, "delivery_info", deliveryInfoId)
                const finalCheck = await getDoc(deliveryInfoRef)
                if (finalCheck.exists()) {
                  const finalData = finalCheck.data()
                  // Chỉ xóa nếu có fingerprintData, đã xác thực và có orderId
                  if (finalData.fingerprintData && 
                      finalData.fingerprintVerified === true && 
                      finalData.orderId) {
                    await cleanupVerifiedDeliveryInfo(deliveryInfoId)
                    console.log("✅ Đã xóa delivery_info sau khi xác thực vân tay thành công")
                  }
                }
              } catch (e) {
                console.error("Lỗi xóa delivery_info sau khi xác thực vân tay:", e)
                // Không throw error, để không ảnh hưởng đến flow chính
              }
            }

            // Hiển thị thông báo thành công
            const sizeLabel = availableLocker.size === "small" ? "Nhỏ" : availableLocker.size === "medium" ? "Vừa" : "Lớn"
            showSuccess("Thành công", `Giữ hàng thành công! Tủ số: ${availableLocker.lockerNumber} (Kích cỡ: ${sizeLabel})`)
            setHoldFormData({ lockerSize: "" })
          } catch (error) {
            console.error("Lỗi xử lý sau xác thực vân tay:", error)
            showError("Lỗi", "Đã xảy ra lỗi. Vui lòng thử lại.")
          }
        }

        // Tạo listener để theo dõi thay đổi real-time
        console.log("🔧 Bắt đầu thiết lập listener cho deliveryInfoId:", deliveryInfoId)
        
        // ✅ QUAN TRỌNG: Đảm bảo listener được thiết lập với includeMetadataChanges để bắt mọi thay đổi
        const unsubscribe = onSnapshot(
          deliveryInfoRef,
          {
            includeMetadataChanges: true // Bắt cả metadata changes
          },
          async (snapshot) => {
            console.log("📡 Listener được gọi! Metadata changed:", snapshot.metadata.hasPendingWrites, "From cache:", snapshot.metadata.fromCache)
            
            if (!snapshot.exists()) {
              console.log("⚠️ Document delivery_info không tồn tại")
              return
            }

            const data = snapshot.data()
            console.log("📡 Nhận được cập nhật delivery_info:", JSON.stringify(data, null, 2))
            console.log("🔍 Kiểm tra fingerprintVerified:", data.fingerprintVerified, "Type:", typeof data.fingerprintVerified)
            
            // Kiểm tra chi tiết giá trị
            if (data.fingerprintVerified === true) {
              console.log("✅ fingerprintVerified === true (boolean)")
            } else if (data.fingerprintVerified === 1) {
              console.log("✅ fingerprintVerified === 1 (number)")
            } else if (data.fingerprintVerified === "true") {
              console.log("✅ fingerprintVerified === 'true' (string)")
            } else if (data.fingerprintVerified === "1") {
              console.log("✅ fingerprintVerified === '1' (string)")
            } else {
              console.log("❌ fingerprintVerified không phải true/1/'true'/'1':", data.fingerprintVerified)
            }
            
            // ✅ SỬA: Kiểm tra fingerprintVerified TRƯỚC fingerprintData
            // Kiểm tra nếu vân tay đã được xác thực (chấp nhận nhiều định dạng từ thiết bị)
            const verified = isFingerprintVerified(data.fingerprintVerified)
            console.log("🔍 Kết quả isFingerprintVerified:", verified)
            
            if (verified) {
              console.log("✅ Phát hiện fingerprintVerified = true, xử lý ngay lập tức!")
              // ✅ Cập nhật UI để hiển thị "đã nhận vân tay"
              setFingerprintReceived(true)
              // Force update UI
              setLoading(false)
              await handleFingerprintVerified(unsubscribe)
              return
            }

            // TỰ ĐỘNG XÓA: Nếu document có fingerprintData (đơn giữ hàng), tự động xóa và reset tủ
            // CHỈ xóa nếu CHƯA được xác thực vân tay (để tránh xóa khi đã xác thực thành công)
            // ✅ QUAN TRỌNG: Kiểm tra lại fingerprintVerified một lần nữa để tránh race condition
            const verifiedCheck = isFingerprintVerified(data.fingerprintVerified)
            if (data.deliveryType === "giu" && data.fingerprintData && !verifiedCheck) {
              console.log("🗑️ Phát hiện fingerprintData trong listener, kiểm tra lại fingerprintVerified:", verifiedCheck)
              
              // Đợi một chút để đảm bảo không có race condition với việc set fingerprintVerified: true
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // Kiểm tra lại một lần nữa sau khi đợi
              const recheckSnapshot = await getDoc(deliveryInfoRef)
              if (recheckSnapshot.exists()) {
                const recheckData = recheckSnapshot.data()
                const recheckVerified = isFingerprintVerified(recheckData.fingerprintVerified)
                
                if (recheckVerified) {
                  console.log("✅ Sau khi đợi, phát hiện fingerprintVerified đã là true, bỏ qua xóa")
                  return // Không xóa, để listener xử lý fingerprintVerified
                }
              }
              
              console.log("🗑️ Xác nhận fingerprintVerified vẫn chưa là true, tiến hành xóa và reset tủ")
              try {
                await autoCleanupDeliveryInfoWithLockerReset(deliveryInfoId)
                console.log("✅ Đã tự động xóa delivery_info có fingerprintData và reset tủ")
              } catch (cleanupError) {
                console.error("Lỗi khi tự động xóa delivery_info:", cleanupError)
              }
              // Dừng listener vì document đã bị xóa
              unsubscribe()
              setFingerprintUnsubscribe(null)
              setCurrentDeliveryInfoId(null)
              setShowFingerprintModal(false)
              return
            } else if (data.deliveryType === "giu" && data.fingerprintData && verifiedCheck) {
              console.log("⚠️ Document có fingerprintData nhưng fingerprintVerified đã là true, bỏ qua xóa")
            }

            // Log nếu chưa được xác thực
            if (data.fingerprintVerified === false || data.fingerprintVerified === "false" || data.fingerprintVerified === 0) {
              console.log("⏳ Vân tay chưa được xác thực, đang chờ...")
            } else {
              console.log("❓ Giá trị fingerprintVerified không xác định:", data.fingerprintVerified)
            }
          },
          (error) => {
            console.error("Lỗi listener delivery_info:", error)
            setShowFingerprintModal(false)
            showError("Lỗi", "Đã xảy ra lỗi khi theo dõi trạng thái vân tay.")
          }
        )

        // Lưu unsubscribe function trước
        setFingerprintUnsubscribe(unsubscribe)

        // Kiểm tra ngay lập tức khi listener được thiết lập xem document đã có fingerprintVerified: true chưa
        const checkInitialState = async () => {
          try {
            const initialSnapshot = await getDoc(deliveryInfoRef)
            if (initialSnapshot.exists()) {
              const initialData = initialSnapshot.data()
              console.log("🔍 Kiểm tra trạng thái ban đầu:", initialData)
              console.log("🔍 fingerprintVerified ban đầu:", initialData.fingerprintVerified, "Type:", typeof initialData.fingerprintVerified)
              const verified = isFingerprintVerified(initialData.fingerprintVerified)
              console.log("🔍 Kết quả kiểm tra ban đầu:", verified)
              
              if (verified) {
                console.log("✅ Document đã có fingerprintVerified: true ngay từ đầu!")
                // ✅ Cập nhật UI để hiển thị "đã nhận vân tay"
                setFingerprintReceived(true)
                await handleFingerprintVerified(unsubscribe)
                return true
              } else {
                console.log("⏳ Document chưa có fingerprintVerified: true, tiếp tục chờ...")
              }
            } else {
              console.log("⚠️ Document không tồn tại khi kiểm tra ban đầu")
            }
          } catch (e) {
            console.error("Lỗi kiểm tra trạng thái ban đầu:", e)
          }
          return false
        }

        // Kiểm tra ngay lập tức
        const alreadyVerified = await checkInitialState()
        if (alreadyVerified) {
          console.log("✅ Đã xử lý xong, dừng thiết lập listener")
          return
        }

        // Thêm polling mỗi 1 giây để đảm bảo không bỏ sót thay đổi (backup cho listener)
        pollIntervalId = setInterval(async () => {
          try {
            const pollSnapshot = await getDoc(deliveryInfoRef)
            if (pollSnapshot.exists()) {
              const pollData = pollSnapshot.data()
              console.log("🔄 Polling check - fingerprintVerified:", pollData.fingerprintVerified, "Type:", typeof pollData.fingerprintVerified)
              const verified = isFingerprintVerified(pollData.fingerprintVerified)
              console.log("🔄 Polling check result:", verified)
              
              if (verified) {
                console.log("✅ Polling phát hiện fingerprintVerified = true!")
                if (pollIntervalId) {
                  clearInterval(pollIntervalId)
                  pollIntervalId = null
                }
                // ✅ Cập nhật UI để hiển thị "đã nhận vân tay"
                setFingerprintReceived(true)
                await handleFingerprintVerified(unsubscribe)
              }
            }
          } catch (e) {
            console.error("Lỗi polling:", e)
          }
        }, 1000) // Kiểm tra mỗi 1 giây

        // Lưu interval để cleanup sau
        const originalUnsubscribe = unsubscribe
        const enhancedUnsubscribe = () => {
          if (pollIntervalId) {
            clearInterval(pollIntervalId)
            pollIntervalId = null
          }
          originalUnsubscribe()
        }
        setFingerprintUnsubscribe(enhancedUnsubscribe)

        // Tạo timeout 60 giây để xóa document nếu không nhận được vân tay
        const timeoutId = setTimeout(async () => {
          console.log("⏰ Hết 60 giây, chưa nhận được vân tay")

          // Kiểm tra lại trạng thái trước khi xóa (phòng trường hợp vân tay được xác thực ngay trước khi timeout)
          try {
            const deliveryInfoRef = doc(db, "delivery_info", deliveryInfoId)
            const snapshot = await getDoc(deliveryInfoRef)
            if (snapshot.exists() && snapshot.data().fingerprintVerified === true) {
              console.log("✅ Vân tay đã được xác thực, không xóa document")
              setFingerprintTimeout(null)
              return
            }
          } catch (e) {
            console.error("Lỗi kiểm tra trạng thái:", e)
          }

          // Dừng listener và polling
          unsubscribe()
          if (pollIntervalId) {
            clearInterval(pollIntervalId)
            pollIntervalId = null
          }
          setFingerprintUnsubscribe(null)

          // Xóa delivery_info nếu chưa được xác thực
          try {
            if (deliveryInfoId) {
              await deleteDeliveryInfo(deliveryInfoId)
              console.log("🗑️ Đã xóa delivery_info do hết thời gian chờ")
            }
          } catch (e) {
            console.error("Lỗi xóa delivery_info:", e)
          }

          // XÓA TRANSACTION nếu đã được tạo (để không còn trong lịch sử)
          if (newOrderId) {
            try {
              const transactionRef = doc(db, "transactions", newOrderId)
              const transactionSnap = await getDoc(transactionRef)
              
              // Chỉ xóa nếu transaction tồn tại và chưa được xác thực vân tay
              if (transactionSnap.exists()) {
                const txData = transactionSnap.data()
                // Chỉ xóa nếu là đơn giữ hàng và chưa được xác thực
                if (txData.transactionType === "hold" && !txData.fingerprintVerified) {
                  await deleteDoc(transactionRef)
                  console.log("🗑️ Đã xóa transaction do hết thời gian chờ vân tay:", newOrderId)
                } else {
                  console.log("⚠️ Transaction đã được xác thực hoặc không phải đơn giữ hàng, không xóa")
                }
              }
            } catch (e) {
              console.error("Lỗi xóa transaction:", e)
              // Nếu không xóa được (do permission), đánh dấu status là expired
              try {
                const transactionRef = doc(db, "transactions", newOrderId)
                await updateDoc(transactionRef, { status: "expired" })
                console.log("⚠️ Đã đánh dấu transaction là expired:", newOrderId)
              } catch (updateError) {
                console.error("Lỗi đánh dấu transaction expired:", updateError)
              }
            }
          }

          // Reset tủ về available
          await releaseReservedLocker()

          // Đóng modal và báo lỗi
          setShowFingerprintModal(false)
          setCurrentDeliveryInfoId(null)
          setFingerprintTimeout(null)
          showError("Hết thời gian", "Đã hết 60 giây mà không nhận được xác thực vân tay. Đơn hàng đã bị hủy. Vui lòng thử lại.")
          setHoldFormData({ lockerSize: "" })
        }, 60000) // 60 giây

        setFingerprintTimeout(timeoutId)
      } else {
        if (holdFormData.lockerSize) {
          const sizeLabel = holdFormData.lockerSize === "small" ? "Nhỏ" : holdFormData.lockerSize === "medium" ? "Vừa" : "Lớn"

          // Hiển thị danh sách tủ khả dụng (sử dụng freshLockers)
          const availableLockersList = freshLockers.filter(l => (l.status || "").trim() === "available")
          const availableSizes = [...new Set(availableLockersList.map(l => l.size))]
          const sizeLabels = availableSizes.map(size =>
            size === "small" ? "Nhỏ" : size === "medium" ? "Vừa" : "Lớn"
          )

          if (availableSizes.length > 0) {
            showError("Lỗi", `Hiện tại tủ ${sizeLabel} đã hết. Mời bạn chọn loại tủ khác để thay thế.\n\nTủ khả dụng: ${sizeLabels.join(", ")}`)
          } else {
            showError("Lỗi", "Hiện tại không còn tủ trống. Vui lòng thử lại sau.")
          }
        } else {
          showError("Lỗi", "Không có tủ trống. Vui lòng thử lại sau.")
        }
        setLoading(false)
      }
    } catch (error) {
      console.error("Lỗi giữ hàng:", error)
      await releaseReservedLocker()
      showError("Lỗi", "Đã xảy ra lỗi. Vui lòng thử lại.")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Quản lý gửi hàng</h2>
        <p className="text-muted-foreground mt-1">Gửi hàng hoặc giữ hàng trong tủ thông minh</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Gửi hàng
          </TabsTrigger>
          <TabsTrigger value="hold" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Giữ hàng
          </TabsTrigger>
        </TabsList>

        {/* Send Package Tab */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {user?.customerType === "shipper" ? "Thông tin giao hàng (Shipper)" : "Thông tin người nhận"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendPackage} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="send-receiverName">Tên người nhận *</Label>
                  <Input
                    id="send-receiverName"
                    placeholder="Nhập tên người nhận"
                    value={sendFormData.receiverName}
                    onChange={(e) => setSendFormData({ ...sendFormData, receiverName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="send-receiverPhone">Số điện thoại người nhận *</Label>
                  <Input
                    id="send-receiverPhone"
                    type="tel"
                    placeholder="Nhập số điện thoại"
                    value={sendFormData.receiverPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setSendFormData({ ...sendFormData, receiverPhone: digits })
                    }}
                    pattern="^\d{10}$"
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>

                {user?.customerType === "shipper" && (
                  <div className="space-y-2">
                    <Label htmlFor="orderCode">Mã đơn hàng *</Label>
                    <Input
                      id="orderCode"
                      placeholder="Nhập mã đơn hàng"
                      value={sendFormData.orderCode}
                      maxLength={8}
                      onChange={(e) => {
                        const val = (e.target.value || "").toString().slice(0, 8)
                        setSendFormData({ ...sendFormData, orderCode: val })
                      }}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="send-lockerSize">Kích cỡ tủ *</Label>
                  <Select
                    value={sendFormData.lockerSize}
                    onValueChange={(value) => setSendFormData({ ...sendFormData, lockerSize: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kích cỡ tủ phù hợp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Nhỏ - Phù hợp cho tài liệu, điện thoại</SelectItem>
                      <SelectItem value="medium">Vừa - Phù hợp cho túi xách, giày dép</SelectItem>
                      <SelectItem value="large">Lớn - Phù hợp cho balo, hộp lớn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      !sendFormData.lockerSize ||
                      lockers.filter(l => (l.status || "").trim() === "available").length === 0
                    }
                    className="w-full bg-[#E31E24] hover:bg-[#C01A1F] text-white"
                  >
                    {loading ? "Đang xử lý..." : lockers.filter(l => (l.status || "").trim() === "available").length === 0 ? "Không còn tủ trống" : "Xác nhận gửi hàng"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hold" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin giữ hàng</CardTitle>
              <p className="text-sm text-muted-foreground">Giữ hàng trong tủ với xác thực vân tay</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleHoldPackage} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hold-lockerSize">Kích cỡ tủ *</Label>
                  <Select
                    value={holdFormData.lockerSize}
                    onValueChange={(value) => setHoldFormData({ ...holdFormData, lockerSize: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kích cỡ tủ phù hợp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Nhỏ - Phù hợp cho tài liệu, điện thoại</SelectItem>
                      <SelectItem value="medium">Vừa - Phù hợp cho túi xách, giày dép</SelectItem>
                      <SelectItem value="large">Lớn - Phù hợp cho balo, hộp lớn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      !holdFormData.lockerSize ||
                      lockers.filter(l => (l.status || "").trim() === "available").length === 0
                    }
                    className="w-full bg-[#2E3192] hover:bg-[#252876] text-white"
                  >
                    {loading ? "Đang xử lý..." : lockers.filter(l => (l.status || "").trim() === "available").length === 0 ? "Không còn tủ trống" : "Xác nhận giữ hàng"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={showFingerprintModal}
        onOpenChange={async (open) => {
          if (!open) {
            // Đóng modal và cleanup listener và timeout
            if (fingerprintUnsubscribe) {
              fingerprintUnsubscribe()
              setFingerprintUnsubscribe(null)
            }
            if (fingerprintTimeout) {
              clearTimeout(fingerprintTimeout)
              setFingerprintTimeout(null)
            }

            // Chỉ xóa document delivery_info nếu chưa được xác thực
            if (currentDeliveryInfoId) {
              try {
                // Kiểm tra trạng thái trước khi xóa
                const deliveryInfoRef = doc(db, "delivery_info", currentDeliveryInfoId)
                const snapshot = await getDoc(deliveryInfoRef)
                if (snapshot.exists() && snapshot.data().fingerprintVerified === true) {
                  console.log("✅ Vân tay đã được xác thực, không xóa document")
                } else {
                  await deleteDeliveryInfo(currentDeliveryInfoId)
                  console.log("🗑️ Đã xóa delivery_info do đóng modal")
                }
              } catch (e) {
                console.error("Lỗi xóa delivery_info:", e)
              }
              setCurrentDeliveryInfoId(null)
            }
            await releaseReservedLocker()
          }
          setShowFingerprintModal(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-[#2E3192]">Xác thực vân tay</DialogTitle>
            <DialogDescription className="text-center pt-4">
              {fingerprintReceived ? "Đã nhận được vân tay!" : "Mời bạn nhập vân tay ở tủ"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              {fingerprintReceived ? (
                // ✅ Hiển thị icon checkmark khi đã nhận vân tay
                <div className="flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="h-16 w-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              ) : (
                // Hiển thị icon fingerprint với animation khi đang chờ
                <>
                  <Fingerprint className="h-24 w-24 text-[#2E3192] animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-32 w-32 rounded-full border-4 border-[#2E3192] border-t-transparent animate-spin" />
                  </div>
                </>
              )}
            </div>
            <p className={`mt-6 text-sm text-center ${fingerprintReceived ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
              {fingerprintReceived 
                ? (currentLockerNumber 
                    ? `Đang xử lý và mở cửa tủ ${currentLockerNumber}...` 
                    : "Đang xử lý và mở cửa tủ...")
                : "Vui lòng nhập vân tay cho đến khi đèn LED tắt"}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Info Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Package className="h-5 w-5" />
              Thông tin trùng lặp
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 font-medium mb-2">
                Thông tin người nhận trùng với thông tin của bạn!
              </p>
              <p className="text-sm text-orange-700">
                Vui lòng sử dụng tính năng "Giữ hàng" thay vì "Gửi hàng" để tránh tốn tài nguyên.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => setShowDuplicateModal(false)}
              variant="outline"
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                setShowDuplicateModal(false)
                // Chuyển sang tab giữ hàng và điền thông tin
                setHoldFormData({
                  lockerSize: sendFormData.lockerSize
                })
                // Chuyển sang tab giữ hàng
                setActiveTab("hold")
              }}
              className="flex-1 bg-[#2E3192] hover:bg-[#252876] text-white"
            >
              Chuyển sang Giữ hàng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Package className="h-5 w-5" />
              {modalTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-green-800 font-medium">
                {modalMessage}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessModal(false)
                router.push("/customer/history")
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Package className="h-5 w-5" />
              {modalTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-red-800">
                {modalMessage}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
