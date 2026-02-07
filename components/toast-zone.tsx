'use client'

import { useStore } from '@/lib/store'

export function ToastZone() {
  const { toasts, removeToast } = useStore()

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-xs">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className={`glass animate-slide-in-right cursor-pointer rounded-lg px-4 py-3 transition-opacity ${
            t.isPriority ? 'border-l-4 border-l-[var(--d360-red)]' : 'border-l-4 border-l-[var(--d360-orange)]'
          }`}
        >
          <div
            className="text-xs font-semibold uppercase tracking-wider text-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            {t.title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {t.body}
          </div>
        </div>
      ))}
    </div>
  )
}
