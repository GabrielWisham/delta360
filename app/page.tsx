'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const DispatchApp = dynamic(
  () => import('@/components/dispatch-app').then(mod => ({ default: mod.DispatchApp })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-sans text-sm">Loading Delta 360...</p>
        </div>
      </div>
    ),
  }
)

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error("[v0] ErrorBoundary caught:", error) }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-background p-8">
          <div className="max-w-lg text-center">
            <h1 className="text-xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <pre className="text-xs text-left bg-red-950/30 border border-red-500/30 rounded-lg p-4 overflow-auto max-h-64 text-red-300 whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Home() {
  return (
    <ErrorBoundary>
      <DispatchApp />
    </ErrorBoundary>
  )
}
