"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { register } from "@/lib/auth"
import { User, Lock, Mail, Phone, ArrowLeft, Eye, EyeOff } from "lucide-react"
import type { CustomerType } from "@/lib/types"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    customerType: "regular" as CustomerType,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }

    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      return
    }

    setLoading(true)

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: "customer",
        customerType: formData.customerType,
        isActive: true,
      })
      router.push("/")
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden py-12">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/campus-bg.png" alt="HCMUTE Campus" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-[#2E3192]/90" />
      </div>

      {/* Register Form */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-white/80 mb-6">
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại</span>
        </Link>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24">
            <Image src="/images/hcmute-logo.jpg" alt="HCMUTE Logo" fill className="object-contain" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-8">TẠO TÀI KHOẢN MỚI</h1>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Name Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <User className="w-5 h-5" />
            </div>
            <Input
              type="text"
              placeholder="Họ và tên"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="pl-12 h-12 bg-white rounded-full text-gray-800 placeholder:text-gray-400 border border-gray-300"
              required
            />
          </div>

          {/* Email Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Mail className="w-5 h-5" />
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-12 h-12 bg-white rounded-full text-gray-800 placeholder:text-gray-400 border border-gray-300"
              required
            />
          </div>

          {/* Phone Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Phone className="w-5 h-5" />
            </div>
            <Input
              type="tel"
              placeholder="Số điện thoại"
              value={formData.phone}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                setFormData({ ...formData, phone: digits })
              }}
              className="pl-12 h-12 bg-white rounded-full text-gray-800 placeholder:text-gray-400 border border-gray-300"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Lock className="w-5 h-5" />
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pl-12 h-12 bg-white rounded-full text-gray-800 placeholder:text-gray-400 border border-gray-300"
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

          {/* Confirm Password Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Lock className="w-5 h-5" />
            </div>
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Xác nhận mật khẩu"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="pl-12 h-12 bg-white rounded-full text-gray-800 placeholder:text-gray-400 border border-gray-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Customer Type Selection */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <Label className="text-white mb-3 block">Loại tài khoản:</Label>
            <RadioGroup
              value={formData.customerType}
              onValueChange={(value) => setFormData({ ...formData, customerType: value as CustomerType })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="regular" id="regular" className="border-white text-white" />
                <Label htmlFor="regular" className="text-white cursor-pointer">
                  Người gửi bình thường
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shipper" id="shipper" className="border-white text-white" />
                <Label htmlFor="shipper" className="text-white cursor-pointer">
                  Shipper
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-300 text-sm text-center">{error}</p>}

          {/* Register Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#E31E24] hover:bg-[#C01A1F] text-white font-bold px-12 py-6 rounded-full text-lg shadow-lg"
            >
              {loading ? "ĐANG TẠO TÀI KHOẢN..." : "ĐĂNG KÝ"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
