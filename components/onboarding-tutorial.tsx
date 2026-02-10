'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { X, ChevronRight, ChevronLeft, Radio, Truck, ClipboardCheck, ArrowRight, Sparkles } from 'lucide-react'

interface TutorialStep {
  icon: React.ReactNode
  tag: string
  title: string
  headline: string
  body: string[]
  action?: { label: string; onClick: () => void }
}

export function OnboardingTutorial({ onDismiss }: { onDismiss: () => void }) {
  const store = useStore()
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem('d360_tutorial_done', '1')
      onDismiss()
    }, 250)
  }, [onDismiss])

  const steps: TutorialStep[] = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      tag: 'Welcome',
      title: 'Welcome to Delta 360',
      headline: 'Your dispatch command center.',
      body: [
        'Delta 360 puts every group, DM, and alert into a single live dashboard built for dispatchers.',
        'This quick tour covers the 3 features that will change how you work. Takes about 30 seconds.',
      ],
    },
    {
      icon: <Radio className="w-6 h-6" />,
      tag: 'Feature 1',
      title: 'Streams',
      headline: 'Monitor multiple groups in one feed.',
      body: [
        'Instead of flipping between chats, Streams let you combine multiple GroupMe groups into a single live feed.',
        'Create a stream for "North Routes" or "Night Shift" and see all their messages together. Set custom alert sounds per stream so you hear what matters.',
        'Set up streams in Config (gear icon) under the Streams tab.',
      ],
      action: {
        label: 'Open Config',
        onClick: () => store.setConfigOpen(true, 'streams'),
      },
    },
    {
      icon: <Truck className="w-6 h-6" />,
      tag: 'Feature 2',
      title: 'Message Builder',
      headline: 'Build load sheets in seconds.',
      body: [
        'No more typing the same delivery info over and over. The Message Builder gives you a structured form for driver name, loads, GPS, products, and more.',
        'GPS coordinates automatically turn into clickable Google Maps links. Save common load configurations as templates so you can reuse them next shift.',
        'Find it under Tools in the top menu bar.',
      ],
      action: {
        label: 'Open Msg Builder',
        onClick: () => store.setMsgBuilderOpen(true),
      },
    },
    {
      icon: <ClipboardCheck className="w-6 h-6" />,
      tag: 'Feature 3',
      title: 'Shift Change',
      headline: 'Hand off cleanly every time.',
      body: [
        'When your shift ends, Shift Change builds a formatted handoff message with all the details the next dispatcher needs.',
        'Save profiles for your teammates so you don\'t have to type their name and phone every time. Select the groups to notify and hit send.',
        'Find it under Actions in the top menu bar.',
      ],
      action: {
        label: 'Open Shift Change',
        onClick: () => store.setShiftChangeOpen(true),
      },
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      tag: 'Ready',
      title: 'You\'re all set',
      headline: 'Start dispatching.',
      body: [
        'Use the sidebar on the left to switch between groups, DMs, and streams. The top menu bar has all your tools.',
        'If you need this tour again, click the question mark icon in the top menu.',
      ],
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1
  const isFirst = step === 0

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-250 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className={`relative w-full max-w-lg mx-4 max-sm:mx-0 max-sm:max-w-full max-sm:h-[100dvh] rounded-2xl max-sm:rounded-none bg-card border border-border shadow-2xl overflow-hidden flex flex-col transition-all duration-250 ${exiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Top gradient accent */}
        <div className="h-1 shrink-0" style={{ background: 'var(--d360-gradient)' }} />

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="px-6 sm:px-8 pt-8 pb-6 flex-1 overflow-y-auto">
          {/* Icon + tag */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: 'var(--d360-gradient)' }}
            >
              {current.icon}
            </div>
            <div>
              <span
                className="text-[9px] uppercase tracking-[0.2em] text-[var(--d360-orange)] font-semibold"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {current.tag}
              </span>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {current.title}
              </h2>
            </div>
          </div>

          {/* Headline */}
          <p className="text-base text-foreground font-medium mb-4 leading-snug">
            {current.headline}
          </p>

          {/* Body paragraphs */}
          <div className="space-y-3 mb-6">
            {current.body.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Try it button */}
          {current.action && (
            <button
              onClick={() => {
                current.action!.onClick()
                dismiss()
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-4 py-2.5 rounded-lg text-white hover:brightness-110 transition-all mb-2"
              style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
            >
              {current.action.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-border bg-secondary/5 shrink-0 safe-bottom">
          {/* Back */}
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={isFirst}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="relative w-2 h-2 rounded-full transition-all"
              >
                <span
                  className={`block w-full h-full rounded-full transition-all ${
                    i === step ? 'scale-125' : 'bg-border hover:bg-muted-foreground/40'
                  }`}
                  style={i === step ? { background: 'var(--d360-gradient)' } : undefined}
                />
                {i < step && (
                  <span className="block w-full h-full rounded-full bg-[var(--d360-orange)]/30 absolute inset-0" />
                )}
              </button>
            ))}
          </div>

          {/* Next / Finish */}
          {isLast ? (
            <button
              onClick={dismiss}
              className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-lg hover:brightness-110 transition-all"
              style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
            >
              Let's Go
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--d360-orange)] hover:brightness-125 transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
