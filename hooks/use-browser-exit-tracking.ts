"use client"

import { useEffect } from 'react'
import { updateLastAccess } from '@/lib/firestore-actions'
import { getCurrentUser } from '@/lib/auth'

export function useBrowserExitTracking() {
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const currentUser = getCurrentUser()
      if (currentUser) {
        try {
          // Sử dụng sendBeacon để đảm bảo request được gửi ngay cả khi trang đang đóng
          const data = JSON.stringify({
            userId: currentUser.id,
            timestamp: new Date().toISOString()
          })
          
          // Gửi request bất đồng bộ với sendBeacon
          navigator.sendBeacon('/api/track-exit', data)
        } catch (error) {
          console.error('Lỗi track exit:', error)
        }
      }
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const currentUser = getCurrentUser()
        if (currentUser) {
          try {
            await updateLastAccess(currentUser.id)
          } catch (error) {
            console.error('Lỗi cập nhật last access:', error)
          }
        }
      }
    }

    // Track khi user đóng tab/window
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Track khi user chuyển tab hoặc minimize window
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
