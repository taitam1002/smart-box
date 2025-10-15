"use client"

import { useBrowserExitTracking } from '@/hooks/use-browser-exit-tracking'

export function BrowserExitTracker() {
  useBrowserExitTracking()
  return null
}
