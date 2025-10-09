"use client"

import { useEffect, useState } from "react"

export function RealTimeClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Tránh hydration mismatch bằng cách không render gì cho đến khi component đã mount
  if (!mounted || !currentTime) {
    return (
      <div className="text-right">
        <div className="text-lg font-mono font-bold text-[#2E3192]">
          --:--:--
        </div>
        <div className="text-sm text-muted-foreground">
          Đang tải...
        </div>
      </div>
    )
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="text-right">
      <div className="text-lg font-mono font-bold text-[#2E3192]">
        {formatTime(currentTime)}
      </div>
      <div className="text-sm text-muted-foreground">
        {formatDate(currentTime)}
      </div>
    </div>
  )
}
