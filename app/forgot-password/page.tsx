"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { Input } from "@/components/ui/input"
import { Mail, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Hiển thị email reset bằng tiếng Việt và gắn continueUrl về trang chủ
      try { auth.languageCode = "vi" } catch {}
      const actionCodeSettings = { url: typeof window !== "undefined" ? window.location.origin + "/" : undefined }
      const normalizedEmail = email.trim().toLowerCase()
      // Gửi trực tiếp; nếu email không tồn tại Firebase sẽ trả về lỗi user-not-found
      await sendPasswordResetEmail(auth, normalizedEmail, actionCodeSettings as any)
      setSubmitted(true)
    } catch (err: any) {
      console.error("reset-password error:", err)
      const code = err?.code || "unknown"
      const msg =
        code === "auth/user-not-found"
          ? "Email chưa được đăng ký. Vui lòng kiểm tra lại hoặc tạo tài khoản mới."
          : code === "auth/invalid-email"
            ? "Địa chỉ email không hợp lệ."
            : `Không gửi được email đặt lại mật khẩu. Mã lỗi: ${code}`
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/images/campus-bg.png" alt="HCMUTE Campus" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#2E3192]/90" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-white/80 mb-6">
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại</span>
        </Link>

        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24">
            <Image src="/images/hcmute-logo.jpg" alt="HCMUTE Logo" fill className="object-contain" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-4">QUÊN MẬT KHẨU</h1>

        {!submitted ? (
          <>
            <p className="text-white/80 text-center mb-8">Nhập email của bạn để nhận liên kết đặt lại mật khẩu</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-white rounded-full"
                  required
                />
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#E31E24] hover:bg-[#C01A1F] text-white font-bold px-12 py-6 rounded-full text-lg shadow-lg"
                >
                  {loading ? "ĐANG GỬI..." : "GỬI LIÊN KẾT"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <p className="text-white text-lg mb-4">Liên kết đặt lại mật khẩu đã được gửi đến email của bạn!</p>
            <p className="text-white/80 text-sm">Vui lòng kiểm tra hộp thư đến và làm theo hướng dẫn.</p>
          </div>
        )}
      </div>
    </div>
  )
}
