"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { auth, db } from "@/lib/firebase"
import { sendPasswordResetEmail } from "firebase/auth"
import { Input } from "@/components/ui/input"
import { Mail, ArrowLeft } from "lucide-react"
import { collection, getDocs, limit, query, where } from "firebase/firestore"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()

      // 🔍 Kiểm tra email có tồn tại trong collection "users" trước khi gửi mail
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", normalizedEmail), limit(1))
      const snap = await getDocs(q)

      if (snap.empty) {
        setError("Email chưa được đăng ký. Vui lòng kiểm tra lại hoặc tạo tài khoản mới.")
        return
      }

      // Hiển thị email reset bằng tiếng Việt và gắn continueUrl về trang chủ
      try { auth.languageCode = "vi" } catch {}
      const actionCodeSettings = { url: typeof window !== "undefined" ? window.location.origin + "/" : undefined }
      // Gửi email đặt lại mật khẩu (đến đây chắc chắn email đã tồn tại trong hệ thống)
      await sendPasswordResetEmail(auth, normalizedEmail, actionCodeSettings as any)
      setSubmitted(true)
    } catch (err: any) {
      console.error("reset-password error:", err)
      const code = err?.code || "unknown"
      const msg =
        code === "auth/invalid-email"
            ? "Địa chỉ email không hợp lệ."
            : `Không gửi được email đặt lại mật khẩu. Mã lỗi: ${code}`
      setError(msg)
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

              {error && (
                <p className="text-red-300 text-sm text-center bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                  {error}
                </p>
              )}

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
            <p className="text-white/80 text-sm">Vui lòng kiểm tra hộp thư đến .</p>
          </div>
        )}
      </div>
    </div>
  )
}
