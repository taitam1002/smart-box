# 📱 Responsive Pagination - Rút gọn cho Mobile

## 🎯 **Mục tiêu:**
Tạo pagination responsive để tránh bị tràn trên mobile, chỉ hiển thị 5 trang thay vì tất cả.

## 🔧 **Giải pháp đã áp dụng:**

### **1. Logic hiển thị trang thông minh**
```tsx
const getVisiblePages = () => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  
  // Chỉ hiển thị 5 trang xung quanh trang hiện tại
  const startPage = Math.max(1, page - 2)
  const endPage = Math.min(totalPages, startPage + 4)
  
  // Điều chỉnh nếu gần cuối
  const adjustedStartPage = Math.max(1, endPage - 4)
  
  return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, i) => adjustedStartPage + i)
}
```

### **2. Responsive Design**
```tsx
// Mobile: gap nhỏ hơn, text nhỏ hơn
<div className="flex items-center justify-center gap-1 sm:gap-2">
  <button className="px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm">
    Trước
  </button>
</div>
```

### **3. Hiển thị trang đầu/cuối với dấu "..."**
```tsx
{/* Trang đầu nếu không trong range */}
{visiblePages[0] > 1 && (
  <>
    <button onClick={() => setPage(1)}>1</button>
    {visiblePages[0] > 2 && <span>...</span>}
  </>
)}

{/* Trang cuối nếu không trong range */}
{visiblePages[visiblePages.length - 1] < totalPages && (
  <>
    {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span>...</span>}
    <button onClick={() => setPage(totalPages)}>{totalPages}</button>
  </>
)}
```

## 📱 **Ví dụ hiển thị:**

### **Trường hợp 1: Ít trang (≤5)**
```
[Trước] [1] [2] [3] [4] [5] [Sau]
```

### **Trường hợp 2: Nhiều trang, ở giữa**
```
[Trước] [1] [...] [8] [9] [10] [11] [12] [...] [20] [Sau]
```

### **Trường hợp 3: Ở đầu**
```
[Trước] [1] [2] [3] [4] [5] [...] [20] [Sau]
```

### **Trường hợp 4: Ở cuối**
```
[Trước] [1] [...] [16] [17] [18] [19] [20] [Sau]
```

## 🎨 **Responsive Styling:**

### **Mobile (< 640px):**
- **Gap**: `gap-1` (4px)
- **Padding**: `px-2` (8px)
- **Text size**: `text-xs` (12px)
- **Max pages**: 5 trang

### **Desktop (≥ 640px):**
- **Gap**: `gap-2` (8px)  
- **Padding**: `px-3` (12px)
- **Text size**: `text-sm` (14px)
- **Max pages**: 5 trang (có thể mở rộng)

## 🔄 **Logic hoạt động:**

### **1. Tính toán range hiển thị:**
```tsx
// Trang hiện tại: 10, tổng: 20 trang
const startPage = Math.max(1, 10 - 2) = 8
const endPage = Math.min(20, 8 + 4) = 12
// Hiển thị: [8] [9] [10] [11] [12]
```

### **2. Điều chỉnh khi gần cuối:**
```tsx
// Trang hiện tại: 18, tổng: 20 trang
const startPage = Math.max(1, 18 - 2) = 16
const endPage = Math.min(20, 16 + 4) = 20
// Hiển thị: [16] [17] [18] [19] [20]
```

### **3. Hiển thị trang đầu/cuối:**
```tsx
// Nếu range không chứa trang 1 → hiển thị [1] [...]
// Nếu range không chứa trang cuối → hiển thị [...] [20]
```

## 📊 **So sánh trước và sau:**

### **❌ Trước (bị tràn):**
```
[Trước] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [11] [12] [13] [14] [15] [16] [17] [18] [19] [20] [Sau]
```

### **✅ Sau (responsive):**
```
[Trước] [1] [...] [8] [9] [10] [11] [12] [...] [20] [Sau]
```

## 🎯 **Lợi ích:**

### **Mobile:**
- ✅ Không bị tràn màn hình
- ✅ Dễ nhấn với kích thước phù hợp
- ✅ Hiển thị đủ thông tin cần thiết
- ✅ UX tốt hơn

### **Desktop:**
- ✅ Vẫn giữ được tính năng đầy đủ
- ✅ Layout đẹp và chuyên nghiệp
- ✅ Dễ sử dụng với chuột

## 📁 **File đã sửa:**
- `components/ui/unified-pagination.tsx` - Thêm logic responsive

## 🚀 **Kết quả:**
- ✅ Pagination không bị tràn trên mobile
- ✅ Hiển thị tối đa 5 trang + trang đầu/cuối
- ✅ Responsive design hoàn hảo
- ✅ UX tốt trên mọi thiết bị

Bây giờ pagination đã responsive và không còn bị tràn trên mobile! 🎉
