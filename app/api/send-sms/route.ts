import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json()

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Thiếu số điện thoại hoặc nội dung tin nhắn' },
        { status: 400 }
      )
    }

    // Kiểm tra cấu hình Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_FROM_NUMBER
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

    // Logging chẩn đoán (ẩn token)
    console.log('[API/send-sms] Incoming:', { to, hasMessage: !!message })
    console.log('[API/send-sms] Env present:', {
      TWILIO_ACCOUNT_SID: !!accountSid,
      TWILIO_AUTH_TOKEN: !!authToken,
      TWILIO_FROM_NUMBER: !!fromNumber,
      TWILIO_MESSAGING_SERVICE_SID: !!messagingServiceSid,
    })

    const envFlags = {
      TWILIO_ACCOUNT_SID: !!accountSid,
      TWILIO_AUTH_TOKEN: !!authToken,
      TWILIO_FROM_NUMBER: !!fromNumber,
      NODE_ENV: process.env.NODE_ENV,
    }

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('⚠️ Twilio chưa được cấu hình (thiếu biến môi trường). Trả về giả lập.')
      return NextResponse.json({
        success: true,
        message: 'SMS giả lập đã gửi',
        simulation: true,
        envFlags
      })
    }

    // Gửi SMS thực tế qua Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const formData = new URLSearchParams()
    formData.append('To', to)
    formData.append('Body', message)
    if (messagingServiceSid) {
      // Ưu tiên sử dụng Messaging Service để Twilio tự chọn số phù hợp quốc gia đích
      formData.append('MessagingServiceSid', messagingServiceSid)
    } else {
      formData.append('From', fromNumber)
    }

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`✅ SMS đã gửi thành công đến ${to}`)
      return NextResponse.json({
        success: true,
        message: 'SMS đã gửi thành công',
        sid: data.sid,
        envFlags
      })
    } else {
      console.error('❌ Lỗi gửi SMS:', data)
      return NextResponse.json(
        { error: 'Lỗi gửi SMS', details: data, envFlags },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Lỗi API gửi SMS:', error)
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    )
  }
}
