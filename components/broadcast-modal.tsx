'use client'

import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/groupme-api'
import { X, Search, Megaphone, Check, Loader2 } from 'lucide-react'

export function BroadcastModal() {
  const store = useStore()
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(
    () => store.groups.filter(g => g.name.toLowerCase().includes(filter.toLowerCase())),
    [store.groups, filter]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') store.setAdhocOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

  function toggleGroup(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(g => g.id)))
  }

  async function handleSend() {
    if (!message.trim() || selected.size === 0) return
    setSending(true)
    const promises = Array.from(selected).map(gid =>
      api.sendGroupMessage(gid, message.trim()).catch(() => null)
    )
    await Promise.all(promises)
    store.showToast('Broadcast', `Sent to ${selected.size} group${selected.size > 1 ? 's' : ''}`)
    setSending(false)
    setMessage('')
    setSelected(new Set())
    store.setAdhocOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => store.setAdhocOpen(false)} />
      <div className="relative w-full max-w-md h-[min(80vh,580px)] mx-4 rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5 text-[var(--d360-orange)]" />
            <h2 className="text-xs uppercase tracking-widest text-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Ad-Hoc Broadcast
            </h2>
          </div>
          <button onClick={() => store.setAdhocOpen(false)} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col px-4 py-3 gap-3">
          {/* Message input */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your broadcast message..."
              className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-mono)' }}
              rows={3}
            />
          </div>

          {/* Group selection header */}
          <div className="flex items-center justify-between">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Recipients ({selected.size}/{store.groups.length})
            </label>
            <button
              onClick={selectAll}
              className="text-[9px] uppercase tracking-widest text-[var(--d360-orange)] hover:brightness-125 transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter groups..."
              className="w-full text-xs bg-secondary/30 border border-border rounded-lg pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* Group list */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border bg-secondary/20">
            {filtered.map(g => {
              const isSelected = selected.has(g.id)
              return (
                <label
                  key={g.id}
                  className={`flex items-center gap-2.5 text-xs cursor-pointer px-3 py-2 transition-colors border-b border-border/50 last:border-b-0 ${
                    isSelected ? 'bg-[var(--d360-orange)]/10' : 'hover:bg-secondary/40'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[var(--d360-orange)] border-[var(--d360-orange)]'
                      : 'border-border bg-secondary/30'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>{g.name}</span>
                </label>
              )
            })}
            {filtered.length === 0 && (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                No groups match filter.
              </div>
            )}
          </div>
        </div>

        {/* Send button */}
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={handleSend}
            disabled={!message.trim() || selected.size === 0 || sending}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-white py-2.5 rounded-lg disabled:opacity-30 transition-all hover:brightness-110"
            style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
          >
            {sending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Megaphone className="w-3.5 h-3.5" />
                {`Broadcast to ${selected.size} group${selected.size !== 1 ? 's' : ''}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
