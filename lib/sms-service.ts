// Service gửi SMS với mã xác thực
export class SMSService {
  // Tạo mã 6 số ngẫu nhiên
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Chuẩn hóa số điện thoại về định dạng E.164 (mặc định VN nếu bắt đầu bằng 0)
  static normalizePhone(rawPhone: string): string {
    if (!rawPhone) return rawPhone
    // Loại bỏ khoảng trắng, dấu gạch
    let phone = rawPhone.replace(/\s|-/g, "")
    // Nếu đã có +, giữ nguyên (nhưng vẫn bỏ khoảng trắng ở trên)
    if (phone.startsWith("+")) return phone
    // Nếu bắt đầu bằng 00 (định dạng quốc tế), đổi 00 -> +
    if (phone.startsWith("00")) return "+" + phone.slice(2)
    // Nếu bắt đầu bằng 0, giả định là số VN -> +84
    if (phone.startsWith("0")) return "+84" + phone.slice(1)
    // Nếu không có + và không bắt đầu bằng 0, để nguyên (có thể số quốc tế thiếu +)
    return phone
  }

  // Gửi SMS thực tế qua Twilio (cần cấu hình)
  static async sendSMSReal(phone: string, message: string): Promise<boolean> {
    try {
      // Kiểm tra xem có cấu hình Twilio không
      const twilioConfig = {
        // Ưu tiên biến môi trường server an toàn
        accountSid: process.env.TWILIO_ACCOUNT_SID || process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN || process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER || process.env.NEXT_PUBLIC_TWILIO_FROM_NUMBER,
      }

      if (!twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.fromNumber) {
        console.warn("⚠️ Twilio chưa được cấu hình. Sử dụng chế độ giả lập.")
        return this.sendSMSSimulation(phone, message)
      }

      // Gửi SMS thực tế qua Twilio
      console.log("[SMS] Using Twilio (server) configuration to send real SMS")
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.normalizePhone(phone),
          message: message
        })
      })

      if (response.ok) {
        console.log(`✅ SMS đã gửi thành công đến ${phone}`)
        return true
      } else {
        console.error("❌ Lỗi gửi SMS:", await response.text())
        return false
      }
    } catch (error) {
      console.error("Lỗi gửi SMS (fallback sang giả lập):", error)
      return this.sendSMSSimulation(phone, message)
    }
  }

  // Gửi SMS giả lập (fallback)
  static async sendSMSSimulation(phone: string, message: string): Promise<boolean> {
    console.log(`📱 [SIMULATION] Gửi SMS đến ${phone}:`)
    console.log(`📝 Nội dung: ${message}`)
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return true
  }

  // Gửi SMS cho người nhận
  static async sendPickupCode(
    receiverPhone: string,
    receiverName: string,
    senderName: string,
    code: string,
    orderCode?: string,
    isShipper: boolean = false
  ): Promise<boolean> {
    try {
      // Tạo nội dung tin nhắn
      let message = `Xin chào ${receiverName}, bạn có một đơn hàng từ ${senderName}. Vui lòng đến tủ để lấy hàng với mã số ${code}!`
      
      if (isShipper && orderCode) {
        message += ` Mã đơn hàng: ${orderCode}`
      }

      // Gửi SMS (thực tế hoặc giả lập)
      return await this.sendSMSReal(this.normalizePhone(receiverPhone), message)
    } catch (error) {
      console.error("Lỗi gửi SMS:", error)
      return false
    }
  }

  // Gửi SMS thông báo đã lấy hàng
  static async sendPickupConfirmation(
    senderPhone: string,
    senderName: string,
    receiverName: string
  ): Promise<boolean> {
    try {
      const message = `Xin chào ${senderName}, ${receiverName} đã lấy hàng thành công từ tủ thông minh.`
      
      return await this.sendSMSReal(senderPhone, message)
    } catch (error) {
      console.error("Lỗi gửi SMS xác nhận:", error)
      return false
    }
  }
}
