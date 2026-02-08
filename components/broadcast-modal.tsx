'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/groupme-api'

export function BroadcastModal() {
  const store = useStore()
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  if (!store.adhocOpen) return null

  function toggleGroup(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
    <div className="glass fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-xl flex flex-col overflow-hidden shadow-2xl m-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-xs uppercase tracking-widest text-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Ad-Hoc Broadcast
          </h2>
          <button onClick={() => store.setAdhocOpen(false)} className="text-muted-foreground hover:text-foreground">
            {'\u2715'}
          </button>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Broadcast message..."
            className="w-full text-sm bg-secondary/40 border border-border rounded-lg px-3 py-2 resize-none max-h-[100px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            rows={3}
          />

          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {store.groups.map(g => (
              <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/40 rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggleGroup(g.id)}
                  className="accent-[var(--d360-orange)]"
                />
                <span className="text-foreground truncate">{g.name}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim() || selected.size === 0 || sending}
            className="w-full text-xs font-semibold uppercase tracking-widest text-white py-2 rounded-lg disabled:opacity-30 transition-all hover:brightness-110"
            style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-jetbrains)' }}
          >
            {sending ? 'Sending...' : `Broadcast to ${selected.size} group${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
