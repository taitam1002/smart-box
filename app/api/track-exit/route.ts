import { NextRequest, NextResponse } from 'next/server'
import { updateLastAccess } from '@/lib/firestore-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Cập nhật thời gian truy cập cuối
    await updateLastAccess(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lỗi track exit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
