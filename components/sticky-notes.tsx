'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { X, History, PenLine, Clock, StickyNote } from 'lucide-react'

const EXPIRY_OPTIONS = [
  { label: 'No expiry', hours: 0 },
  { label: '1 hour', hours: 1 },
  { label: '4 hours', hours: 4 },
  { label: '8 hours', hours: 8 },
  { label: '24 hours', hours: 24 },
]

export function StickyNotes() {
  const store = useStore()
  const [text, setText] = useState('')
  const [expiry, setExpiry] = useState(0)
  const [showHistory, setShowHistory] = useState(false)

  const view = store.currentView
  const key = view.type === 'group' ? view.id || 'all' :
    view.type === 'dm' ? `dm_${view.id}` :
    view.type === 'stream' ? `stream_${view.id}` : 'all'

  const current = store.stickies[key]
  const isExpired = current?.exp && Date.now() > current.exp

  const historyForKey = useMemo(
    () => store.stickyHistory.filter(h => h.key === key).reverse(),
    [store.stickyHistory, key]
  )

  if (!store.stickyOpen) return null

  function handleSave() {
    if (!text.trim()) return
    store.saveStickyNote(key, text.trim(), expiry)
    setText('')
  }

  return (
    <div className="border-b border-border bg-card px-3 py-2.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <StickyNote className="w-3 h-3 text-[var(--d360-yellow)]" />
          <span
            className="text-[9px] uppercase tracking-widest text-[var(--d360-yellow)] font-semibold"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Sticky Note
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            {showHistory ? <PenLine className="w-3 h-3" /> : <History className="w-3 h-3" />}
            {showHistory ? 'Edit' : 'History'}
          </button>
          <button
            onClick={() => store.setStickyOpen(false)}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="max-h-[120px] overflow-y-auto rounded-lg border border-border bg-secondary/20">
          {historyForKey.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                No history for this view.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {historyForKey.map((h, i) => (
                <div key={i} className="flex items-start gap-2 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />
                    <span className="text-[10px]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      {new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-[10px] text-foreground whitespace-pre-wrap break-words">{h.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Current note */}
          {current && !isExpired && (
            <div className="text-xs text-foreground mb-2 px-2.5 py-1.5 rounded-lg bg-secondary/30 border-l-2 border-l-[var(--d360-yellow)] whitespace-pre-wrap break-words">
              {current.text}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-1.5">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSave()
                }
              }}
              placeholder="Write a note... (Shift+Enter for new line)"
              className="flex-1 text-xs bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 resize-none max-h-[60px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-yellow)]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
              rows={2}
            />
            <div className="flex flex-col gap-1">
              <select
                value={expiry}
                onChange={e => setExpiry(Number(e.target.value))}
                className="text-[9px] bg-secondary/30 border border-border rounded-lg px-1.5 py-1 text-foreground"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {EXPIRY_OPTIONS.map(o => (
                  <option key={o.hours} value={o.hours}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="text-[9px] uppercase tracking-wider text-white px-2 py-1 rounded-lg disabled:opacity-30 transition-all hover:brightness-110"
                style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-jetbrains)' }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
