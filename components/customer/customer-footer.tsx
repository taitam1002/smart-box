"use client"

import React from "react"

export function CustomerFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#2E3192]/20 bg-[#2E3192] text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <p className="order-2 sm:order-1 opacity-90">
          © {new Date().getFullYear()} Smart Box System. All rights reserved.
        </p>
        <div className="order-1 sm:order-2 flex items-center gap-3">
          <a
            href="https://hcmute.edu.vn"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            HCMUTE
          </a>
          <span className="opacity-60">•</span>
          <span className="opacity-90">Phiên bản 1.0.2</span>
        </div>
      </div>
    </footer>
  )
}


