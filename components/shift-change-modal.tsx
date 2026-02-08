'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/groupme-api'

export function ShiftChangeModal() {
  const store = useStore()
  const [outgoing, setOutgoing] = useState(store.user?.name || '')
  const [incoming, setIncoming] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDMs, setSelectedDMs] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  if (!store.shiftChangeOpen) return null

  const message = `\u{1F4CB} SHIFT CHANGE\n${outgoing} is going off shift.\n${incoming} is now on dispatch \u2014 ${phone}.`

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleDM(id: string) {
    setSelectedDMs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (!incoming.trim() || (selectedGroups.size === 0 && selectedDMs.size === 0)) return
    setSending(true)

    const groupPromises = Array.from(selectedGroups).map(gid =>
      api.sendGroupMessage(gid, message).catch(() => null)
    )
    const dmPromises = Array.from(selectedDMs).map(uid =>
      api.sendDM(uid, message).catch(() => null)
    )

    await Promise.all([...groupPromises, ...dmPromises])
    store.showToast('Shift Change', 'Sent successfully')
    setSending(false)
    store.setShiftChangeOpen(false)
  }

  return (
    <div className="glass fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-xl flex flex-col overflow-hidden shadow-2xl m-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-xs uppercase tracking-widest text-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Shift Change
          </h2>
          <button onClick={() => store.setShiftChangeOpen(false)} className="text-muted-foreground hover:text-foreground">
            {'\u2715'}
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <input
              value={outgoing}
              onChange={e => setOutgoing(e.target.value)}
              placeholder="Outgoing dispatcher"
              className="w-full text-xs bg-secondary/40 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            />
            <input
              value={incoming}
              onChange={e => setIncoming(e.target.value)}
              placeholder="Incoming dispatcher"
              className="w-full text-xs bg-secondary/40 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
              autoFocus
            />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full text-xs bg-secondary/40 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            />
          </div>

          {/* Preview */}
          <div className="text-[10px] text-muted-foreground bg-secondary/40 rounded p-2 whitespace-pre-wrap" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            {message}
          </div>

          {/* Group selection */}
          <div className="max-h-[150px] overflow-y-auto space-y-0.5">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              Send to groups
            </span>
            {store.groups.map(g => (
              <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/40 rounded px-2 py-0.5">
                <input type="checkbox" checked={selectedGroups.has(g.id)} onChange={() => toggleGroup(g.id)} className="accent-[var(--d360-orange)]" />
                <span className="text-foreground truncate">{g.name}</span>
              </label>
            ))}

            <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 block" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              Send to DMs
            </span>
            {store.dmChats.filter(d => store.approved[d.other_user?.id] !== false).map(d => (
              <label key={d.other_user.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/40 rounded px-2 py-0.5">
                <input type="checkbox" checked={selectedDMs.has(d.other_user.id)} onChange={() => toggleDM(d.other_user.id)} className="accent-[var(--d360-orange)]" />
                <span className="text-foreground truncate">{d.other_user.name}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleSend}
            disabled={!incoming.trim() || (selectedGroups.size === 0 && selectedDMs.size === 0) || sending}
            className="w-full text-xs font-semibold uppercase tracking-widest text-white py-2 rounded-lg disabled:opacity-30 transition-all hover:brightness-110"
            style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-jetbrains)' }}
          >
            {sending ? 'Sending...' : 'Send Shift Change'}
          </button>
        </div>
      </div>
    </div>
  )
}
