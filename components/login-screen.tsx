'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { resumeAudio } from '@/lib/sounds'
import { ExternalLink, Copy, Check, X, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react'

const STEPS = [
  {
    title: 'Go to the GroupMe Developer Site',
    body: 'Open your browser and visit the link below. This is where GroupMe lets you grab your personal access token.',
    action: 'https://dev.groupme.com',
    actionLabel: 'Open dev.groupme.com',
  },
  {
    title: 'Log in with your GroupMe account',
    body: 'Use the same email and password you use for the GroupMe app. If you use "Sign in with Facebook/Google," tap that instead.',
  },
  {
    title: 'Find your Access Token',
    body: 'Once logged in, look at the top-right corner of the page. You\'ll see a field labeled "Access Token" with a long string of letters and numbers. That\'s it!',
  },
  {
    title: 'Copy the token',
    body: 'Click on the token text to highlight it, then copy it (Ctrl+C on PC, Cmd+C on Mac). Or tap and hold on mobile and choose Copy.',
  },
  {
    title: 'Paste it here and connect',
    body: 'Come back to this screen, tap the token input box, and paste (Ctrl+V / Cmd+V). Then hit Connect. You\'re in!',
  },
]

export function LoginScreen() {
  const { login, isLoggingIn } = useStore()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(true)
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)

  // Check if user has dismissed guide before
  useEffect(() => {
    const dismissed = localStorage.getItem('d360_guide_dismissed')
    if (dismissed === '1') setShowGuide(false)
  }, [])

  function dismissGuide() {
    setShowGuide(false)
    localStorage.setItem('d360_guide_dismissed', '1')
  }

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

  const currentStep = STEPS[step]

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
            fontFamily: 'var(--font-mono)',
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
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Delta 360 Dispatch
          </h1>
        </div>

        <div className="w-full flex flex-col gap-3">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Paste your token here"
            className="w-full px-4 py-3 rounded-lg bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--d360-orange)] text-sm"
            style={{ fontFamily: 'var(--font-mono)' }}
            disabled={isLoggingIn}
            autoFocus={!showGuide}
          />

          <button
            type="submit"
            disabled={isLoggingIn || !token.trim()}
            className="w-full py-3 rounded-lg text-sm font-semibold uppercase tracking-widest text-white disabled:opacity-50 transition-all hover:brightness-110"
            style={{
              fontFamily: 'var(--font-mono)',
              background: 'var(--d360-gradient)',
            }}
          >
            {isLoggingIn ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-[var(--d360-red)]">{error}</p>
        )}

        <button
          type="button"
          onClick={() => { setShowGuide(true); setStep(0) }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--d360-orange)] transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How do I get my token?</span>
        </button>
      </form>

      {/* Onboarding guide overlay */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={dismissGuide} />
          <div className="relative w-full max-w-md mx-4 rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'var(--d360-gradient)' }}
                >
                  {step + 1}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Getting Started</h2>
                  <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                    Step {step + 1} of {STEPS.length}
                  </p>
                </div>
              </div>
              <button
                onClick={dismissGuide}
                className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-secondary/30">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                  background: 'var(--d360-gradient)',
                }}
              />
            </div>

            {/* Body */}
            <div className="px-5 py-5 min-h-[160px] flex flex-col gap-3">
              <h3 className="text-base font-semibold text-foreground leading-snug">
                {currentStep.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep.body}
              </p>

              {/* Link button on step 1 */}
              {currentStep.action && (
                <a
                  href={currentStep.action}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 self-start mt-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition-all"
                  style={{ background: 'var(--d360-gradient)' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  {currentStep.actionLabel}
                </a>
              )}

              {/* Copy hint on step 4 */}
              {step === 3 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground font-mono select-all">
                    AbCdEf1234567890...
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                    className="p-2 rounded-lg bg-secondary/40 border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-secondary/5">
              <button
                type="button"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === step ? 'scale-125' : 'bg-secondary hover:bg-muted-foreground/40'
                    }`}
                    style={i === step ? { background: 'var(--d360-gradient)' } : undefined}
                  />
                ))}
              </div>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--d360-orange)] hover:brightness-125 transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={dismissGuide}
                  className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:brightness-110 transition-all"
                  style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
                >
                  Got it!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
