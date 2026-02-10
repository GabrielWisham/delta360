import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import { StoreProvider } from '@/lib/store'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: 'Delta 360 | Dispatch Command Center',
  description:
    'Professional real-time dispatch command center powered by GroupMe. Monitor multiple groups, manage team status, and organize communications.',
}

export const viewport: Viewport = {
  themeColor: '#ff5c00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${outfit.variable} ${jetbrains.variable} antialiased`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}
