'use client'

import { useStore } from '@/lib/store'
import { X, BellOff } from 'lucide-react'

export function ToastZone() {
  const { toasts, removeToast, msgToasts, removeMsgToast, toggleToastMuted, switchView } = useStore()

  const hasAny = toasts.length > 0 || msgToasts.length > 0
  if (!hasAny) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-xs pointer-events-none">
      {/* Action toasts (sends, errors, exports) */}
      {toasts.map(t => (
        <div
          key={`a-${t.id}`}
          onClick={() => removeToast(t.id)}
          className={`glass animate-slide-in-right cursor-pointer rounded-lg px-4 py-3 transition-opacity pointer-events-auto ${
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

      {/* Message preview toasts */}
      {msgToasts.map(t => (
        <div
          key={`m-${t.id}`}
          className="glass animate-slide-in-right rounded-lg overflow-hidden pointer-events-auto border-l-4 border-l-[var(--d360-orange)] group"
        >
          {/* Clickable body -- navigates to the source chat */}
          <button
            onClick={() => {
              removeMsgToast(t.id)
              switchView(t.viewType, t.viewId)
            }}
            className="w-full text-left px-3 py-2.5 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] uppercase tracking-widest font-bold text-[var(--d360-orange)] truncate"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {t.sourceName}
              </span>
              <span className="flex-1" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className="text-[11px] font-semibold text-foreground shrink-0"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {t.senderName}:
              </span>
              <span className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                {t.text}
              </span>
            </div>
          </button>
          {/* Action row */}
          <div className="flex items-center border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                toggleToastMuted(t.sourceKey)
                removeMsgToast(t.id)
              }}
              className="flex items-center gap-1.5 flex-1 px-3 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
              title={`Mute toasts from ${t.sourceName}`}
            >
              <BellOff className="w-3 h-3" />
              Mute this feed
            </button>
            <button
              onClick={() => removeMsgToast(t.id)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
