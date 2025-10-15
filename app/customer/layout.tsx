import type React from "react"
import { CustomerHeader } from "@/components/customer/customer-header"
import { CustomerFooter } from "@/components/customer/customer-footer"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <CustomerHeader />
      <main className="container mx-auto px-4 py-6 flex-1">{children}</main>
      <CustomerFooter />
    </div>
  )
}
