'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'

export function ContactsPanel() {
  const store = useStore()
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const contacts = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; imageUrl: string | null; groups: string[] }>()

    store.groups.forEach(group => {
      group.members?.forEach(m => {
        const existing = map.get(m.user_id)
        if (existing) {
          existing.groups.push(group.name)
        } else {
          map.set(m.user_id, {
            userId: m.user_id,
            name: m.nickname,
            imageUrl: m.image_url,
            groups: [group.name],
          })
        }
      })
    })

    return Array.from(map.values())
      .filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [store.groups, filter])

  if (!store.contactsOpen) return null

  return (
    <div className="glass fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass w-full max-w-lg max-h-[80vh] rounded-xl flex flex-col overflow-hidden shadow-2xl m-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2
            className="text-xs uppercase tracking-widest text-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Contact Directory ({contacts.length})
          </h2>
          <button onClick={() => store.setContactsOpen(false)} className="text-muted-foreground hover:text-foreground">
            {'\u2715'}
          </button>
        </div>

        <div className="px-4 py-2 border-b border-border">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search contacts..."
            className="w-full text-xs bg-secondary/40 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {contacts.map(c => {
            const isExpanded = expanded.has(c.userId)
            const maxShown = 4
            const showGroups = isExpanded ? c.groups : c.groups.slice(0, maxShown)
            const more = c.groups.length - maxShown

            return (
              <div
                key={c.userId}
                className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-secondary/40 cursor-pointer"
                onClick={() => { store.switchView('dm', c.userId); store.setContactsOpen(false) }}
              >
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover mt-0.5" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-secondary text-foreground mt-0.5">
                    {c.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      {c.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      {c.groups.length} group{c.groups.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {showGroups.join(', ')}
                    {more > 0 && !isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpanded(prev => { const n = new Set(prev); n.add(c.userId); return n })
                        }}
                        className="ml-1 text-[var(--d360-orange)] hover:underline"
                      >
                        +{more} more
                      </button>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
