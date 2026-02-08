'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'

export function MembersPanel() {
  const store = useStore()
  const [filter, setFilter] = useState('')

  if (!store.membersOpen) return null

  const view = store.currentView

  const members = useMemo(() => {
    const seen = new Map<string, { userId: string; name: string; imageUrl: string | null; role: string; groups: string[] }>()

    if (view.type === 'group' && view.id) {
      const group = store.groups.find(g => g.id === view.id)
      if (group) {
        group.members?.forEach(m => {
          seen.set(m.user_id, {
            userId: m.user_id,
            name: m.nickname,
            imageUrl: m.image_url,
            role: m.roles?.includes('admin') ? 'Admin' : 'Member',
            groups: [group.name],
          })
        })
      }
    } else if (view.type === 'stream' && view.id && store.streams[view.id]) {
      const stream = store.streams[view.id]
      stream.ids.forEach(gid => {
        const group = store.groups.find(g => g.id === gid)
        if (group) {
          group.members?.forEach(m => {
            const existing = seen.get(m.user_id)
            if (existing) {
              existing.groups.push(group.name)
            } else {
              seen.set(m.user_id, {
                userId: m.user_id,
                name: m.nickname,
                imageUrl: m.image_url,
                role: m.roles?.includes('admin') ? 'Admin' : 'Member',
                groups: [group.name],
              })
            }
          })
        }
      })
    } else if (view.type === 'dm' && view.id) {
      const dm = store.dmChats.find(d => d.other_user?.id === view.id)
      if (dm) {
        seen.set(dm.other_user.id, {
          userId: dm.other_user.id,
          name: dm.other_user.name,
          imageUrl: dm.other_user.avatar_url,
          role: 'Contact',
          groups: [],
        })
      }
    } else {
      store.groups.forEach(group => {
        group.members?.forEach(m => {
          const existing = seen.get(m.user_id)
          if (existing) {
            existing.groups.push(group.name)
          } else {
            seen.set(m.user_id, {
              userId: m.user_id,
              name: m.nickname,
              imageUrl: m.image_url,
              role: m.roles?.includes('admin') ? 'Admin' : 'Member',
              groups: [group.name],
            })
          }
        })
      })
    }

    return Array.from(seen.values())
      .filter(m => !filter || m.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [view, store.groups, store.dmChats, store.streams, filter])

  return (
    <div className="glass fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass w-full max-w-lg max-h-[80vh] rounded-xl flex flex-col overflow-hidden shadow-2xl m-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2
            className="text-xs uppercase tracking-widest text-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Members ({members.length})
          </h2>
          <button
            onClick={() => store.setMembersOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            {'\u2715'}
          </button>
        </div>

        <div className="px-4 py-2 border-b border-border">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name..."
            className="w-full text-xs bg-secondary/40 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/40">
              {m.imageUrl ? (
                <img src={m.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover" crossOrigin="anonymous" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-secondary text-foreground">
                  {m.name[0]?.toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {m.name}
                  </span>
                  {m.userId === store.user?.id && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-[var(--d360-orange)] text-white" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      YOU
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {m.role}
                  </span>
                </div>
                {m.groups.length > 0 && (
                  <p className="text-[9px] text-muted-foreground truncate">{m.groups.join(', ')}</p>
                )}
              </div>

              {m.userId !== store.user?.id && (
                <button
                  onClick={() => { store.switchView('dm', m.userId); store.setMembersOpen(false) }}
                  className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-[var(--d360-cyan)] transition-colors"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  Message
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
