# Cấu hình Environment Variables

Tạo file `.env.local` trong thư mục gốc với nội dung sau:

```env
# Firebase Configuration (Bắt buộc)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Twilio SMS Configuration (Tùy chọn - để gửi SMS thực tế)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Public Twilio Variables (Tùy chọn)
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=your_twilio_account_sid
NEXT_PUBLIC_TWILIO_AUTH_TOKEN=your_twilio_auth_token
NEXT_PUBLIC_TWILIO_FROM_NUMBER=+1234567890
```

## Lưu ý:
- Nếu không cấu hình Twilio, hệ thống sẽ sử dụng chế độ giả lập
- Không commit file `.env.local` vào Git
- Xem `SMS_SETUP.md` để biết cách lấy thông tin Twilio
