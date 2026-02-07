'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { resumeAudio } from '@/lib/sounds'

export function LoginScreen() {
  const { login, isLoggingIn } = useStore()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setError('')
    resumeAudio()
    const result = await login(token.trim())
    if (!result.success) {
      setError(result.error || 'Connection failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Radial orange glow */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--d360-orange), transparent 70%)' }}
      />

      <form
        onSubmit={handleSubmit}
        className="glass relative z-10 flex flex-col items-center gap-6 p-10 rounded-2xl w-full max-w-sm"
      >
        {/* Delta logo */}
        <div
          className="text-7xl font-bold"
          style={{
            fontFamily: 'var(--font-jetbrains)',
            background: 'var(--d360-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {'\u0394'}
        </div>

        <div className="flex flex-col items-center gap-1">
          <h1
            className="text-xs tracking-[0.3em] uppercase text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Delta 360 Dispatch
          </h1>
        </div>

        <div className="w-full flex flex-col gap-3">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="GroupMe API Token"
            className="w-full px-4 py-3 rounded-lg bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--d360-orange)] text-sm"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
            disabled={isLoggingIn}
            autoFocus
          />

          <button
            type="submit"
            disabled={isLoggingIn || !token.trim()}
            className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-widest text-white disabled:opacity-50 transition-all hover:brightness-110"
            style={{
              fontFamily: 'var(--font-jetbrains)',
              background: 'var(--d360-gradient)',
            }}
          >
            {isLoggingIn ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-[var(--d360-red)]">{error}</p>
        )}

        <a
          href="https://dev.groupme.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-[var(--d360-orange)] transition-colors"
        >
          Get your token at dev.groupme.com
        </a>
      </form>
    </div>
  )
}
