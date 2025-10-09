"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login } from "@/lib/auth"
import { ensureDefaultAdmin, ensureDefaultLockers } from "@/lib/seed-data"
import { User, Lock, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([
          ensureDefaultAdmin(),
          ensureDefaultLockers(),
        ])
      } catch (e) {
        // ignore bootstrap errors on UI
      } finally {
        setBooting(false)
      }
    }
    bootstrap()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const user = await login(email, password)
      if (user) {
        if (user.role === "admin") {
          router.push("/admin/dashboard")
        } else {
          router.push("/customer/dashboard")
        }
      } else {
        setError("Email hoặc mật khẩu không đúng")
      }
    } catch (err: any) {
      // Hiển thị thông báo lỗi chi tiết từ auth.ts (bao gồm tài khoản bị khóa)
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/campus-bg.png" alt="HCMUTE Campus" fill className="object-cover" priority />
        {/* Blue Overlay */}
        <div className="absolute inset-0 bg-[#2E3192]/90" />
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32">
            <Image src="/images/hcmute-logo.jpg" alt="HCMUTE Logo" fill className="object-contain" />
          </div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-4xl font-bold text-white text-center mb-12 text-balance">WELCOME SMART BOX</h1>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Account Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="w-5 h-5" />
            </div>
            <Input
              type="email"
              placeholder="Account"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-12 h-14 bg-white rounded-full text-base"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-5 h-5" />
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12 h-14 bg-white rounded-full text-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-300 text-sm text-center">{error}</p>}

          {/* Links */}
          <div className="text-center">
            <Link href="/forgot-password" className="text-white hover:underline text-sm">
              Forgot password?
            </Link>
            <span className="text-white mx-2">|</span>
            <Link href="/register" className="text-white hover:underline text-sm">
              Create account
            </Link>
          </div>

          {/* Login Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              disabled={loading || booting}
              className="bg-[#E31E24] hover:bg-[#C01A1F] text-white font-bold px-16 py-6 rounded-full text-lg shadow-lg"
            >
              {booting ? "ĐANG KHỞI TẠO..." : loading ? "ĐANG ĐĂNG NHẬP..." : "LOGIN"}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-white/70 text-xs text-center mt-12">A product of TAM-DUY-K21</p>
      </div>
    </div>
  )
}
