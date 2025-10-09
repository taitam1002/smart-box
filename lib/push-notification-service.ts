// Service gửi Push Notification thay thế SMS
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { initializeApp } from 'firebase/app'

export class PushNotificationService {
  // Khởi tạo FCM
  static async initializeFCM() {
    try {
      const messaging = getMessaging()
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      })
      
      if (token) {
        console.log('FCM Token:', token)
        return token
      }
    } catch (error) {
      console.error('Lỗi khởi tạo FCM:', error)
    }
    return null
  }

  // Gửi notification đến user cụ thể
  static async sendToUser(userId: string, title: string, body: string) {
    try {
      const response = await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          body,
          data: {
            type: 'pickup_code',
            timestamp: new Date().toISOString()
          }
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('Lỗi gửi push notification:', error)
      return false
    }
  }

  // Gửi notification cho pickup code
  static async sendPickupNotification(
    receiverId: string,
    receiverName: string,
    senderName: string,
    code: string
  ) {
    const title = `📦 Bạn có đơn hàng mới từ ${senderName}`
    const body = `Mã lấy hàng: ${code}. Vui lòng đến tủ để lấy hàng!`
    
    return await this.sendToUser(receiverId, title, body)
  }
}
