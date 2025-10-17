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
import ReactCountryFlag from "react-country-flag"

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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden animate-fade-in">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/campus-bg.png" 
          alt="HCMUTE Campus" 
          fill 
          className="object-cover animate-zoom-in" 
          priority 
        />
        {/* Blue Overlay */}
        <div className="absolute inset-0 bg-[#1590bd]/40 animate-fade-in" />
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
        {/* Logo */}
        <div className="logo-container animate-bounce-in">
          <div className="relative w-35 h-35 sm:w-42 sm:h-42 bg-white/70 rounded-full shadow-xl">
            <Image 
              src="/images/Logo HCMUTE_White background.png" 
              alt="HCMUTE Logo" 
              fill 
              className="logo-image" 
            />
          </div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-3xl leading-relaxed font-bold text-white text-center mb-12 text-balance animate-fade-in-delay">WELCOME SMART BOX</h1>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6 animate-slide-up-delay">
          {/* Account Input */}
          <div className="relative animate-input-focus">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300 ">
              <User className="w-5 h-5" />
            </div>
            <Input
              type="email"
              placeholder="Tài khoản"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-12 h-14 bg-white rounded-full text-base transition-all duration-300 hover:shadow-lg focus:shadow-xl focus:scale-105"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative animate-input-focus">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300">
              <Lock className="w-5 h-5" />
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12 h-14 bg-white rounded-full text-base transition-all duration-300 hover:shadow-lg focus:shadow-xl focus:scale-105"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-300 hover:scale-110"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="animate-shake">
              <p className="text-red-300 text-sm text-center bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                {error}
              </p>
            </div>
          )}

          {/* Links */}
          <div className="text-center animate-fade-in-delay-2 bg-[#2e56a6] backdrop-blur-md rounded-full p-2">
            <Link 
              href="/forgot-password" 
              className="text-white font-semibold hover:underline text-md transition-colors duration-300 hover:text-blue-300"
            >
              Quên mật khẩu?
            </Link>
            <span className="text-white mx-2">|</span>
            <Link 
              href="/register" 
              className="text-white font-semibold hover:underline text-md transition-colors duration-300 hover:text-blue-300"
            >
              Tạo tài khoản
            </Link>
          </div>

          {/* Login Button */}
          <div className="flex justify-center pt-4 animate-button-pulse">
            <Button
              type="submit"
              disabled={loading || booting}
              className="bg-[#E31E24] hover:bg-[#C01A1F] text-white font-bold px-16 py-6 rounded-full text-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {booting ? "ĐANG KHỞI TẠO..." : loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-white/70 text-md text-center mt-12 flex items-center justify-center gap-2 animate-fade-in-delay-3">
        Một sản phẩm của TAM-DUY-K21
        <ReactCountryFlag
          countryCode="VN"
          svg
          className="animate-wave"
          style={{
            width: "1.5em",
            height: "1.5em",
            borderRadius: "4px",
          }}
        />
      </p>
              
      </div>
    </div>
  )
}
