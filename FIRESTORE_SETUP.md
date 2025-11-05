# Hướng dẫn cấu hình Firestore Security Rules

## Vấn đề
Bạn đang gặp lỗi "Missing or insufficient permissions" vì Firestore Security Rules đang chặn tất cả truy cập.

## Cách 1: Cập nhật qua Firebase Console (Khuyến nghị - Nhanh nhất)

1. **Mở Firebase Console:**
   - Truy cập: https://console.firebase.google.com/
   - Chọn project: `storage-8cc1b`

2. **Vào Firestore Database:**
   - Ở menu bên trái, chọn **Firestore Database**
   - Click vào tab **Rules**

3. **Copy và paste rules sau vào Firebase Console:**

### Rules cho Development (Tạm thời - Dễ sử dụng):
**Copy rules này vào Firebase Console:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cho phép tất cả người dùng đã đăng nhập đọc/ghi
    // Và cho phép tạo user ban đầu khi chưa đăng nhập (cho seeding)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null || !exists(/databases/$(database)/documents/users/$(userId));
      allow update, delete: if request.auth != null;
    }
    
    // Cho phép tất cả collection khác khi đã đăng nhập
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**HOẶC rules đơn giản nhất (cho development):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
*Lưu ý: Với rules này, bạn cần đăng nhập trước khi seeding có thể chạy.*

### Rules cho Production (Bảo mật hơn):
Xem file `firestore.rules` trong project để có rules chi tiết hơn.

4. **Publish Rules:**
   - Click nút **Publish** ở trên cùng
   - Đợi vài giây để rules được áp dụng

5. **Kiểm tra:**
   - Refresh lại trang web của bạn
   - Thử đăng nhập lại

## Cách 2: Deploy bằng Firebase CLI

1. **Cài đặt Firebase CLI (nếu chưa có):**
   ```bash
   npm install -g firebase-tools
   ```

2. **Đăng nhập Firebase:**
   ```bash
   firebase login
   ```

3. **Khởi tạo Firebase trong project (nếu chưa có):**
   ```bash
   firebase init firestore
   ```
   - Chọn project: `storage-8cc1b`
   - Chọn file rules hiện có: `firestore.rules`

4. **Deploy rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

## Lưu ý quan trọng:

⚠️ **Rules cho Development** ở trên cho phép bất kỳ ai đã đăng nhập đều có thể đọc/ghi tất cả dữ liệu. 
Chỉ sử dụng trong quá trình phát triển.

✅ **Rules cho Production** trong file `firestore.rules` có kiểm tra quyền chi tiết hơn, an toàn hơn.

Sau khi cập nhật rules, hãy thử đăng nhập lại!

