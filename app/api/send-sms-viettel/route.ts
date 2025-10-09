import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json()

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Thiếu số điện thoại hoặc nội dung tin nhắn' },
        { status: 400 }
      )
    }

    // Kiểm tra cấu hình Viettel
    const apiKey = process.env.VIETTEL_SMS_API_KEY
    const brandName = process.env.VIETTEL_SMS_BRAND_NAME || 'SMARTBOX'
    const baseUrl = process.env.VIETTEL_SMS_BASE_URL || 'https://api.viettelpost.vn'

    if (!apiKey) {
      console.warn('⚠️ Viettel SMS chưa được cấu hình. Trả về giả lập.')
      return NextResponse.json({
        success: true,
        message: 'SMS Viettel giả lập đã gửi',
        simulation: true
      })
    }

    // Gửi SMS qua Viettel API
    const viettelUrl = `${baseUrl}/api/sms/send`
    
    const response = await fetch(viettelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
        brand_name: brandName
      })
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`✅ SMS Viettel đã gửi thành công đến ${phone}`)
      return NextResponse.json({
        success: true,
        message: 'SMS Viettel đã gửi thành công',
        data: data
      })
    } else {
      console.error('❌ Lỗi gửi SMS Viettel:', data)
      return NextResponse.json(
        { error: 'Lỗi gửi SMS Viettel', details: data },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Lỗi API gửi SMS Viettel:', error)
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
