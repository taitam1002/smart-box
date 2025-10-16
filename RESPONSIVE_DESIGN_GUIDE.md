# Hướng dẫn Responsive Design cho Smart Box System

## Tổng quan

Responsive Design là kỹ thuật thiết kế web giúp giao diện tự động điều chỉnh theo kích thước màn hình của các thiết bị khác nhau (điện thoại, tablet, desktop).

## Breakpoints (Điểm ngắt màn hình)

Dự án sử dụng Tailwind CSS với các breakpoints sau:

```css
xs: 475px   // Extra small devices (điện thoại nhỏ)
sm: 640px   // Small devices (điện thoại)
md: 768px   // Medium devices (tablet)
lg: 1024px  // Large devices (laptop)
xl: 1280px  // Extra large devices (desktop)
2xl: 1536px // 2X large devices (màn hình lớn)
```

## Các kỹ thuật Responsive Design

### 1. Mobile-First Approach

Luôn bắt đầu thiết kế từ mobile trước, sau đó mở rộng lên các màn hình lớn hơn:

```jsx
// ❌ Sai - Desktop-first
<div className="w-64 sm:w-32">

// ✅ Đúng - Mobile-first  
<div className="w-32 sm:w-64">
```

### 2. Responsive Grid System

```jsx
// Grid responsive cho cards
<div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
  {cards.map(card => <Card key={card.id} />)}
</div>
```

### 3. Responsive Typography

```jsx
// Text size responsive
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Tiêu đề
</h1>

<p className="text-sm sm:text-base">
  Nội dung
</p>
```

### 4. Responsive Spacing

```jsx
// Padding responsive
<div className="p-4 sm:p-6 lg:p-8">
  Nội dung
</div>

// Margin responsive
<div className="mt-4 sm:mt-6 lg:mt-8">
  Nội dung
</div>
```

### 5. Responsive Images

```jsx
// Image responsive
<img 
  src="/image.jpg" 
  alt="Description"
  className="w-full h-auto object-cover"
/>
```

### 6. Responsive Flexbox

```jsx
// Flex direction responsive
<div className="flex flex-col sm:flex-row gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Justify content responsive
<div className="flex justify-center sm:justify-start">
  Nội dung
</div>
```

## Components Responsive

### ResponsiveContainer

```jsx
import { ResponsiveContainer } from "@/components/admin/responsive-container"

<ResponsiveContainer 
  maxWidth="full" 
  padding="md"
  className="bg-gray-50"
>
  {children}
</ResponsiveContainer>
```

### ResponsiveGrid

```jsx
import { ResponsiveGrid } from "@/components/admin/responsive-container"

<ResponsiveGrid cols={5} gap="md">
  {items.map(item => <Item key={item.id} />)}
</ResponsiveGrid>
```

### ResponsiveCard

```jsx
import { ResponsiveCard } from "@/components/admin/responsive-container"

<ResponsiveCard hover={true}>
  <div className="p-4">
    Nội dung card
  </div>
</ResponsiveCard>
```

## Best Practices

### 1. Sử dụng Container Queries (nếu có thể)

```jsx
// Container query cho component
<div className="@container">
  <div className="@sm:flex @lg:grid">
    Nội dung
  </div>
</div>
```

### 2. Responsive Navigation

```jsx
// Mobile menu
<div className="lg:hidden">
  <MobileMenu />
</div>

// Desktop menu  
<div className="hidden lg:block">
  <DesktopMenu />
</div>
```

### 3. Responsive Tables

```jsx
// Table responsive với scroll horizontal
<div className="overflow-x-auto">
  <table className="min-w-full">
    <thead>
      <tr>
        <th className="px-4 py-2">Cột 1</th>
        <th className="px-4 py-2">Cột 2</th>
      </tr>
    </thead>
  </table>
</div>
```

### 4. Responsive Charts

```jsx
// Chart container responsive
<div className="h-64 sm:h-72 lg:h-80">
  <Chart data={data} />
</div>
```

## Testing Responsive Design

### 1. Browser DevTools

- Mở DevTools (F12)
- Click vào icon mobile/tablet
- Test các breakpoints khác nhau

### 2. Real Device Testing

- Test trên điện thoại thật
- Test trên tablet thật
- Test trên desktop với các kích thước khác nhau

### 3. Online Tools

- [Responsive Design Checker](https://www.responsivedesignchecker.com/)
- [BrowserStack](https://www.browserstack.com/)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)

## Common Issues & Solutions

### 1. Text quá nhỏ trên mobile

```jsx
// ❌ Sai
<p className="text-xs">Nội dung</p>

// ✅ Đúng
<p className="text-sm sm:text-xs">Nội dung</p>
```

### 2. Button quá nhỏ trên mobile

```jsx
// ❌ Sai
<button className="px-2 py-1">Click</button>

// ✅ Đúng
<button className="px-4 py-2 sm:px-2 sm:py-1">Click</button>
```

### 3. Card quá rộng trên mobile

```jsx
// ❌ Sai
<div className="w-96">Card</div>

// ✅ Đúng
<div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">Card</div>
```

### 4. Grid quá nhiều cột trên mobile

```jsx
// ❌ Sai
<div className="grid grid-cols-5 gap-2">

// ✅ Đúng
<div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
```

## Performance Tips

### 1. Lazy Loading Images

```jsx
<img 
  src="/image.jpg" 
  loading="lazy"
  className="w-full h-auto"
/>
```

### 2. Conditional Rendering

```jsx
// Chỉ render component nặng trên desktop
{isDesktop && <HeavyComponent />}
```

### 3. CSS-in-JS Optimization

```jsx
// Sử dụng CSS variables thay vì inline styles
<div className="bg-primary text-primary-foreground">
  Nội dung
</div>
```

## Tools & Resources

### 1. Tailwind CSS Responsive

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind CSS Breakpoints](https://tailwindcss.com/docs/responsive-design#breakpoints)

### 2. Design Systems

- [Material Design](https://material.io/design)
- [Ant Design](https://ant.design/)
- [Chakra UI](https://chakra-ui.com/)

### 3. Testing Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)

## Kết luận

Responsive Design là yếu tố quan trọng trong việc phát triển web hiện đại. Bằng cách tuân theo các nguyên tắc và best practices trên, bạn có thể tạo ra giao diện web hoạt động tốt trên mọi thiết bị.

Nhớ luôn test trên nhiều thiết bị khác nhau và ưu tiên trải nghiệm người dùng trên mobile vì phần lớn người dùng hiện tại sử dụng điện thoại để truy cập web.
