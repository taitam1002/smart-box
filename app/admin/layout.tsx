import type React from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { LockerAutoUpdater } from "@/components/admin/locker-auto-updater"
import { Toaster } from "@/components/ui/sonner"
import { NotificationFixer } from "@/components/admin/notification-fixer"
import { AdminFooter } from "@/components/admin/admin-footer"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Lockers đã được khởi tạo trong trang login, không cần gọi lại ở đây
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
        <AdminFooter />
        <Toaster position="bottom-right" richColors />
      </div>
      <LockerAutoUpdater />
      <NotificationFixer />
    </div>
  )
}
