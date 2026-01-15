import { NextRequest, NextResponse } from 'next/server'
import { handlePickupFromNotification, saveNotification } from '@/lib/firestore-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, lockerNumber, lockerId, message } = body

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      )
    }

    // Xử lý nhận hàng và cập nhật transaction status
    const result = await handlePickupFromNotification(orderId, lockerNumber || lockerId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Failed to process pickup' },
        { status: 400 }
      )
    }

    // Tạo notification để ghi nhận việc nhận hàng từ phần cứng
    try {
      await saveNotification({
        type: "pickup",
        message: message || `Đã nhận hàng từ tủ ${lockerNumber || lockerId || 'N/A'}`,
        lockerId: lockerId,
        orderId: orderId,
        isRead: false,
        createdAt: new Date(),
      })
    } catch (notificationError) {
      console.error("Lỗi tạo notification:", notificationError)
      // Không throw error vì việc tạo notification không quan trọng bằng việc cập nhật transaction
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Pickup processed successfully'
    })
  } catch (error: any) {
    console.error('Lỗi xử lý pickup từ phần cứng:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

