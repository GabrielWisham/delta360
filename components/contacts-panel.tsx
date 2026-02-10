'use client'

import { useState, useMemo, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { X, Search } from 'lucide-react'

export function ContactsPanel() {
  const store = useStore()
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // All hooks must be called before any early return
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') store.setContactsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => store.setContactsOpen(false)} />
      <div className="relative w-full max-w-lg h-[min(80vh,600px)] max-sm:h-[100dvh] max-sm:max-w-full max-sm:rounded-none mx-4 max-sm:mx-0 rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2
            className="text-xs uppercase tracking-widest text-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Contact Directory ({contacts.length})
          </h2>
          <button onClick={() => store.setContactsOpen(false)} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search contacts..."
              className="w-full text-xs bg-secondary/30 border border-border rounded-lg pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
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
                  <img src={c.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover mt-0.5 ring-1" style={{ '--tw-ring-color': 'var(--d360-avatar-ring)' } as React.CSSProperties} />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-secondary text-foreground mt-0.5 ring-1" style={{ '--tw-ring-color': 'var(--d360-avatar-ring)' } as React.CSSProperties}>
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

          {contacts.length === 0 && (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              No contacts found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
