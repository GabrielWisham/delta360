'use client'

import dynamic from 'next/dynamic'

const DispatchApp = dynamic(() => import('@/components/dispatch-app').then(mod => ({ default: mod.DispatchApp })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground font-sans text-sm">Loading Delta 360...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return <DispatchApp />
}
