import type React from "react"
import { CustomerHeader } from "@/components/customer/customer-header"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
