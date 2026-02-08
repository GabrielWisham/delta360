'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'

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

  if (!store.stickyOpen) return null

  const view = store.currentView
  const key = view.type === 'group' ? view.id || 'all' :
    view.type === 'dm' ? `dm_${view.id}` :
    view.type === 'stream' ? `stream_${view.id}` : 'all'

  const current = store.stickies[key]
  const isExpired = current?.exp && Date.now() > current.exp

  const historyForKey = store.stickyHistory.filter(h => h.key === key).reverse()

  function handleSave() {
    if (!text.trim()) return
    store.saveStickyNote(key, text.trim(), expiry)
    setText('')
  }

  return (
    <div className="border-b border-border px-3 py-2" style={{ background: 'rgba(255, 204, 0, 0.04)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[9px] uppercase tracking-widest text-[var(--d360-yellow)]"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          Sticky Note
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-[9px] text-muted-foreground hover:text-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            {showHistory ? 'Edit' : 'History'}
          </button>
          <button
            onClick={() => store.setStickyOpen(false)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="max-h-[120px] overflow-y-auto space-y-1">
          {historyForKey.length === 0 ? (
            <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              No history for this view
            </p>
          ) : (
            historyForKey.map((h, i) => (
              <div key={i} className="text-[10px] text-muted-foreground flex items-start gap-2 px-1 py-0.5">
                <span className="shrink-0" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-foreground">{h.text}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {current && !isExpired && (
            <div className="text-xs text-foreground mb-1.5 px-2 py-1 rounded bg-[rgba(255,204,0,0.08)] border-l-2 border-l-[var(--d360-yellow)]">
              {current.text}
            </div>
          )}

          <div className="flex gap-1.5">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a note..."
              className="flex-1 text-xs bg-secondary/40 border border-border rounded px-2 py-1 resize-none max-h-[60px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-yellow)]"
              rows={2}
            />
            <div className="flex flex-col gap-1">
              <select
                value={expiry}
                onChange={e => setExpiry(Number(e.target.value))}
                className="text-[9px] bg-secondary/40 border border-border rounded px-1 py-0.5 text-foreground"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {EXPIRY_OPTIONS.map(o => (
                  <option key={o.hours} value={o.hours}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="text-[9px] uppercase tracking-wider text-white px-2 py-0.5 rounded disabled:opacity-30"
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
