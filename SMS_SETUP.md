# Hướng dẫn cấu hình SMS

## 1. Cấu hình Twilio (Khuyến nghị)

### Bước 1: Tạo tài khoản Twilio
1. Truy cập [Twilio Console](https://console.twilio.com/)
2. Đăng ký tài khoản miễn phí
3. Xác minh số điện thoại

### Bước 2: Lấy thông tin API
1. Vào Dashboard → Account Info
2. Copy **Account SID** và **Auth Token**
3. Mua số điện thoại Twilio (Phone Numbers → Manage → Buy a number)

### Bước 3: Cấu hình Environment Variables
Tạo file `.env.local` trong thư mục gốc:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890

# Public variables (optional)
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=your_account_sid_here
NEXT_PUBLIC_TWILIO_AUTH_TOKEN=your_auth_token_here
NEXT_PUBLIC_TWILIO_FROM_NUMBER=+1234567890
```

## 2. Cấu hình SMS Provider Việt Nam

### Viettel SMS API
```env
VIETTEL_SMS_API_KEY=your_api_key
VIETTEL_SMS_BRAND_NAME=your_brand_name
```

### VNPT SMS API
```env
VNPT_SMS_USERNAME=your_username
VNPT_SMS_PASSWORD=your_password
VNPT_SMS_BRAND_NAME=your_brand_name
```

## 3. Kiểm tra cấu hình

Sau khi cấu hình, hệ thống sẽ:
- ✅ Gửi SMS thực tế nếu có cấu hình
- ⚠️ Sử dụng chế độ giả lập nếu chưa cấu hình

## 4. Test SMS

1. Gửi một đơn hàng
2. Kiểm tra console log để xem SMS có được gửi không
3. Kiểm tra điện thoại người nhận

## 5. Troubleshooting

### Lỗi thường gặp:
- **"Twilio chưa được cấu hình"**: Kiểm tra file `.env.local`
- **"Invalid phone number"**: Đảm bảo số điện thoại có định dạng +84xxxxxxxxx
- **"Insufficient funds"**: Nạp tiền vào tài khoản Twilio

### Log kiểm tra:
```bash
# Xem log trong console browser
📱 [SIMULATION] Gửi SMS đến +84xxxxxxxxx
📝 Nội dung: Xin chào...

# Hoặc log thực tế
✅ SMS đã gửi thành công đến +84xxxxxxxxx
```

## 6. Chi phí

- **Twilio**: ~$0.0075/SMS (khoảng 180 VND/SMS)
- **Viettel**: Liên hệ để báo giá
- **VNPT**: Liên hệ để báo giá

## 7. Bảo mật

⚠️ **QUAN TRỌNG**: Không commit file `.env.local` vào Git!
- Thêm `.env.local` vào `.gitignore`
- Sử dụng biến môi trường trên server production
