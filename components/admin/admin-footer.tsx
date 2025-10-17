"use client"

import React from "react"

export function AdminFooter() {
  return (
    <footer className="border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <p className="order-2 sm:order-1">
          © {new Date().getFullYear()} Smart Box System. All rights reserved.
        </p>
        <div className="order-1 sm:order-2 flex items-center gap-3">
          <a
            href="https://hcmute.edu.vn"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#2E3192] transition-colors"
          >
            HCMUTE
          </a>
          <span className="opacity-40">•</span>
          <span>Phiên bản 1.0.2</span>
        </div>
      </div>
    </footer>
  )
}


