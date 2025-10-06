import type React from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { Toaster } from "@/components/ui/sonner"
import { ensureDefaultLockers } from "@/lib/seed-data"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Ensure 6 default lockers exist on layout mount
  if (typeof window !== "undefined") {
    // fire-and-forget; idempotent
    ensureDefaultLockers().catch(() => {})
  }
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
        <Toaster position="bottom-right" richColors />
      </div>
    </div>
  )
}
