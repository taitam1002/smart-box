import type React from "react"
import { CustomerHeader } from "@/components/customer/customer-header"
import { CustomerFooter } from "@/components/customer/customer-footer"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <CustomerHeader />
      <main className="flex-1 overflow-y-auto pt-[120px] pb-20">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <CustomerFooter />
    </div>
  )
}
