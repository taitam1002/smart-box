import { NextRequest, NextResponse } from 'next/server'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Khởi tạo Firebase Admin (nếu chưa có)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, data } = await request.json()

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Thiếu thông tin cần thiết' },
        { status: 400 }
      )
    }

    // Lưu notification vào Firestore
    const db = getFirestore()
    const notificationRef = db.collection('notifications').doc()
    
    await notificationRef.set({
      id: notificationRef.id,
      userId: userId,
      title: title,
      body: body,
      data: data || {},
      isRead: false,
      createdAt: new Date(),
      type: 'push_notification'
    })

    // TODO: Gửi FCM message thực tế
    // Cần cấu hình FCM server key
    
    console.log(`✅ Push notification đã gửi đến user ${userId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Push notification đã gửi thành công'
    })
    
  } catch (error) {
    console.error('Lỗi gửi push notification:', error)
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
