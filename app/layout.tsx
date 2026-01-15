import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { BrowserExitTracker } from '@/components/browser-exit-tracker'
import { DeliveryInfoAutoCleanup } from '@/components/delivery-info-auto-cleanup'
import { PickupNotificationHandler } from '@/components/pickup-notification-handler'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smart Box - Hệ thống tủ thông minh',
  description: 'Created with Smart Box',
  generator: 'Smart Box.app',
  icons:{
    icon: '/images/hcmute-logo.jpg',
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <BrowserExitTracker />
        <DeliveryInfoAutoCleanup />
        <PickupNotificationHandler />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
