import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Delta 360 | Dispatch Command Center",
  description: "Professional team dispatch command center powered by GroupMe.",
}

export const viewport: Viewport = {
  themeColor: "#f97316",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
