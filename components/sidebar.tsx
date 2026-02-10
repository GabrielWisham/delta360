'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'
import { formatTimeAgo, getLastMsgTs } from '@/lib/date-helpers'
import { playSound } from '@/lib/sounds'
import { api } from '@/lib/groupme-api'
import { SOUND_NAMES } from '@/lib/types'
import type { SoundName } from '@/lib/types'

const FOUR_HOURS = 14400

/* ===== SVG Icons ===== */
function PinIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 17v5" /><path d="M9 2h6l-1.5 5.5L16 11h-3.5l-.5 6-.5-6H8l2.5-3.5z" />
    </svg>
  )
}
function MuteIcon({ muted, className = '' }: { muted?: boolean; className?: string }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14" /><path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  )
}
function DotsVIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
    </svg>
  )
}
function ChevronIcon({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? 'rotate-90' : ''} ${className}`}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function GripIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
    </svg>
  )
}
function EyeIcon({ open, className = '' }: { open: boolean; className?: string }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
function EditIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
function SoundIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  )
}
function PlayCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  )
}
function LayersIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}
function UserPlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

/* ===== Portal menu hook ===== */
function usePortalMenu() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuWidth = 200
      let left = rect.right - menuWidth
      if (left < 8) left = 8
      if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8
      let top = rect.bottom + 4
      if (top + 300 > window.innerHeight) top = rect.top - 300
      if (top < 4) top = 4
      setPos({ top, left })
    }
    setOpen(prev => !prev)
  }, [open])

  useEffect(() => {
    if (!open) return
    let closeHandler: ((e: MouseEvent) => void) | null = null
    const timer = setTimeout(() => {
      closeHandler = (e: MouseEvent) => {
        const target = e.target as Node
        if (btnRef.current?.contains(target)) return
        if (menuRef.current?.contains(target)) return
        setOpen(false)
      }
      document.addEventListener('mousedown', closeHandler)
    }, 50)
    return () => {
      clearTimeout(timer)
      if (closeHandler) document.removeEventListener('mousedown', closeHandler)
    }
  }, [open])

  return { open, pos, btnRef, menuRef, toggle, close: () => setOpen(false) }
}

/* ===== Add Member Modal (inline in portal) ===== */
function AddMemberModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [onClose])

  async function handleAdd() {
    if (!userId.trim()) return
    setLoading(true)
    try {
      await api.addMemberToGroup(groupId, userId.trim(), userId.trim())
      setResult('Member added successfully')
      setTimeout(onClose, 1200)
    } catch {
      setResult('Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
      <div ref={ref} className="bg-card border border-border rounded-xl shadow-2xl p-5 w-[340px] max-w-[90vw]">
        <h3 className="text-sm font-bold font-mono text-foreground mb-3">Add Member to Group</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1 block">User ID</label>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="GroupMe user ID"
              className="w-full text-xs font-mono bg-secondary/40 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            />
          </div>
          {result && (
            <p className={`text-xs font-mono ${result.includes('success') ? 'text-[var(--d360-green)]' : 'text-[var(--d360-red)]'}`}>{result}</p>
          )}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleAdd}
              disabled={loading || !userId.trim()}
              className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-lg bg-[var(--d360-orange)] text-white hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
            <button onClick={onClose} className="px-3 py-2 text-xs font-mono rounded-lg bg-secondary/60 text-foreground/70 hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ===== Main Sidebar ===== */
export function Sidebar() {
  const store = useStore()
  const now = Math.floor(Date.now() / 1000)

  /* Section-level drag */
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const gripAllowedRef = useRef(false)

  /* Collapsed sections */
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const toggleCollapse = useCallback((key: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // If expanding the inactive section, load inactive chats (deferred to avoid setState-in-render)
      if (key === 'inactive' && prev[key]) {
        queueMicrotask(() => store.setInactiveOpen(true))
      }
      return next
    })
  }, [store])

  /* Active dots-menu ID for highlighting */
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const feedMuted = store.feedMuted
  const dmsMuted = store.dmMuted

  const sortedGroups = useMemo(() => {
    const items = store.groups.map(g => ({
      type: 'group' as const, id: g.id, name: g.name,
      ts: getLastMsgTs(g), imageUrl: g.image_url,
    }))
    const dmItems = store.dmChats
      .filter(d => store.approved[d.other_user?.id] !== false)
      .map(d => ({
        type: 'dm' as const, id: d.other_user?.id || '',
        name: d.other_user?.name || 'DM', ts: d.updated_at,
        imageUrl: d.other_user?.avatar_url,
      }))
    return [...items, ...dmItems].sort((a, b) => b.ts - a.ts)
  }, [store.groups, store.dmChats, store.approved])

  const pinnedIds = useMemo(() => new Set(Object.keys(store.pinnedChats).filter(k => store.pinnedChats[k])), [store.pinnedChats])
  const pinnedItems = useMemo(() => sortedGroups.filter(i => pinnedIds.has(i.id)), [sortedGroups, pinnedIds])
  const active = useMemo(() => sortedGroups.filter(i => (now - i.ts) < FOUR_HOURS && !pinnedIds.has(i.id)), [sortedGroups, now, pinnedIds])
  const inactive = useMemo(() => sortedGroups.filter(i => (now - i.ts) >= FOUR_HOURS && !pinnedIds.has(i.id)), [sortedGroups, now, pinnedIds])

  const pendingDMs = useMemo(() => {
    return store.dmChats.filter(d => {
      const uid = d.other_user?.id
      if (!uid) return false
      if (store.approved[uid] !== undefined) return false
      if (store.lastSeen[uid]) return false
      if (d.last_message && store.user && d.last_message.sender_id === store.user.id) return false
      if (d.updated_at && (now - d.updated_at) > 86400) return false
      return true
    })
  }, [store.dmChats, store.approved, store.lastSeen, store.user, now])

  const unreadCount = active.filter(i => store.isUnread(i.id, i.ts)).length
  const hasStreams = Object.keys(store.streams).length > 0

  function handleClick(type: 'group' | 'dm', id: string, e: React.MouseEvent) {
    if (e.shiftKey) store.openSecondaryPanel(type, id)
    else store.switchView(type, id)
  }

  const isDesktopHidden = store.sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth > 600

  /* Section drag handlers - only initiated from grip icon */
  function onSectionDragStart(e: React.DragEvent, idx: number) {
    if (!gripAllowedRef.current) { e.preventDefault(); return }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'section')
    setDragIdx(idx)
  }
  function onSectionDragOver(e: React.DragEvent, idx: number) {
    if (dragIdx === null) return
    e.preventDefault()
    setDragOverIdx(idx)
  }
  function onSectionDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
    const order = [...store.sectionOrder]
    const [moved] = order.splice(dragIdx, 1)
    order.splice(idx, 0, moved)
    store.setSectionOrder(order)
    setDragIdx(null)
    setDragOverIdx(null)
  }
  function onSectionDragEnd() { setDragIdx(null); setDragOverIdx(null); gripAllowedRef.current = false }

  /* Section renderer map */
  const sections: Record<string, { label: string; render: () => React.ReactNode }> = {
    command: {
      label: 'Command',
      render: () => (
        <>
          {/* Universal Feed */}
          <div className="flex items-center gap-1 mb-0.5">
            <button
              onClick={(e) => { if (e.shiftKey) store.openSecondaryPanel('all', null); else store.switchView('all', null) }}
              className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-lg text-[13px] font-mono uppercase tracking-wider transition-all min-w-0 ${
                store.currentView.type === 'all' ? 'text-foreground font-bold' : 'text-foreground/70 hover:text-foreground'
              }`}
              style={{
                background: store.currentView.type === 'all'
                  ? 'linear-gradient(90deg, rgba(255,106,0,0.35) 0%, rgba(255,106,0,0.08) 50%, transparent 100%)'
                  : 'rgba(255,106,0,0.06)',
                borderLeft: store.currentView.type === 'all' ? '3px solid var(--d360-orange)' : '3px solid transparent',
              }}
            >
              Universal Feed
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); store.setFeedMuted(!feedMuted) }}
              className={`p-1 shrink-0 transition-colors ${feedMuted ? 'text-[var(--d360-red)]' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
              title={feedMuted ? 'Unmute feed' : 'Mute feed'}
            >
              <MuteIcon muted={feedMuted} className="w-4 h-4" />
            </button>
          </div>
          {/* Direct Comms */}
          <div className="flex items-center gap-1 mb-0.5">
            <button
              onClick={(e) => { if (e.shiftKey) store.openSecondaryPanel('dms', null); else store.switchView('dms', null) }}
              className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-lg text-[13px] font-mono uppercase tracking-wider transition-all min-w-0 ${
                store.currentView.type === 'dms' ? 'text-foreground font-bold' : 'text-foreground/70 hover:text-foreground'
              }`}
              style={{
                background: store.currentView.type === 'dms'
                  ? 'linear-gradient(90deg, rgba(34,211,238,0.30) 0%, rgba(34,211,238,0.06) 50%, transparent 100%)'
                  : 'rgba(34,211,238,0.05)',
                borderLeft: store.currentView.type === 'dms' ? '3px solid var(--d360-cyan)' : '3px solid transparent',
              }}
            >
              Direct Comms
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); store.setDmMuted(!dmsMuted) }}
              className={`p-1 shrink-0 transition-colors ${dmsMuted ? 'text-[var(--d360-red)]' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
              title={dmsMuted ? 'Unmute DMs' : 'Mute DMs'}
            >
              <MuteIcon muted={dmsMuted} className="w-4 h-4" />
            </button>
          </div>
          {/* Unified Streams */}
          {hasStreams && (() => {
            const toggledCount = Object.keys(store.streams).filter(k => store.streamToggles.has(k)).length
            const unifiedMuted = store.unifiedMuted
            return (
              <div className="flex items-center gap-1 mb-0.5">
                <button
                  onClick={(e) => { if (e.shiftKey) store.openSecondaryPanel('unified_streams', null); else store.switchView('unified_streams', null) }}
                  className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-lg text-[13px] font-mono uppercase tracking-wider transition-all min-w-0 ${
                    store.currentView.type === 'unified_streams' ? 'text-foreground font-bold' : 'text-foreground/70 hover:text-foreground'
                  }`}
                  style={{
                    background: store.currentView.type === 'unified_streams'
                      ? 'linear-gradient(90deg, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0.06) 50%, transparent 100%)'
                      : 'rgba(168,85,247,0.05)',
                    borderLeft: store.currentView.type === 'unified_streams' ? '3px solid #a855f7' : '3px solid transparent',
                  }}
                >
                  <LayersIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {toggledCount > 0 ? `Unified Streams (${toggledCount})` : 'Toggle Streams'}
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); store.setUnifiedMuted(!unifiedMuted) }}
                  className={`p-1 shrink-0 transition-colors ${unifiedMuted ? 'text-[var(--d360-red)]' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                  title={unifiedMuted ? 'Unmute unified streams' : 'Mute unified streams'}
                >
                  <MuteIcon muted={unifiedMuted} className="w-4 h-4" />
                </button>
              </div>
            )
          })()}
        </>
      ),
    },

    streams: {
      label: 'Streams',
      render: () => <StreamsSection store={store} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />,
    },

    pending: {
      label: `Pending DMs (${pendingDMs.length})`,
      render: () => pendingDMs.length > 0 ? (
        <>
          {pendingDMs.map(d => (
            <div key={d.other_user.id} className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs bg-secondary/50 mb-1">
              <span className="text-foreground flex-1 truncate font-semibold font-mono">{d.other_user.name}</span>
              <span className="text-muted-foreground truncate max-w-[80px] text-[10px]">{d.last_message?.text || ''}</span>
              <button onClick={() => store.approveDM(d.other_user.id)} className="text-[var(--d360-green)] hover:brightness-125 font-bold px-1 text-base" title="Approve">{'\u2713'}</button>
              <button onClick={() => store.blockDM(d.other_user.id)} className="text-[var(--d360-red)] hover:brightness-125 font-bold px-1 text-base" title="Block">{'\u2715'}</button>
            </div>
          ))}
        </>
      ) : null,
    },

    pinned: {
      label: 'Pinned',
      render: () => pinnedItems.length > 0 ? (
        <>
          {pinnedItems.map(item => (
            <ChatCard key={item.id} item={item} store={store} onClick={(e) => handleClick(item.type, item.id, e)} isPinned menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />
          ))}
        </>
      ) : null,
    },

    active: {
      label: `Active${unreadCount > 0 ? ` (${unreadCount})` : ''}`,
      render: () => (
        <>
          {active.map(item => (
            <ChatCard key={item.id} item={item} store={store} onClick={(e) => handleClick(item.type, item.id, e)} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />
          ))}
          {active.length === 0 && <p className="text-[11px] text-muted-foreground px-2 py-2 font-mono">No active chats</p>}
        </>
      ),
    },

    inactive: {
      label: `Inactive (${inactive.length})`,
      render: () => inactive.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {inactive.map(item => (
            <ChatCard key={item.id} item={item} store={store} onClick={(e) => handleClick(item.type, item.id, e)} isInactive menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />
          ))}
        </div>
      ) : null,
    },
  }

  return (
    <>
      {store.sidebarMobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => store.toggleSidebarMobile()} />
      )}
      <aside
        className={`
          flex flex-col border-r border-border overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out shrink-0
          ${store.sidebarMobileOpen
            ? 'fixed inset-y-0 left-0 z-40 w-[300px] shadow-2xl translate-x-0'
            : 'fixed inset-y-0 left-0 z-40 w-[300px] shadow-2xl -translate-x-full md:translate-x-0 md:static md:shadow-none'}
          ${isDesktopHidden ? 'md:w-0 md:border-r-0 md:overflow-hidden' : 'md:w-[300px]'}
        `}
        style={{ background: 'var(--d360-sidebar-bg)' }}
      >
        <div className="p-3 flex flex-col gap-1">
          {store.sectionOrder.map((sectionKey, idx) => {
            const sec = sections[sectionKey]
            if (!sec) return null
            const isCollapsed = collapsedSections[sectionKey] ?? false
            const content = sec.render()
            if (!content && sectionKey !== 'command') return null

            const isOver = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx

            return (
              <div
                key={sectionKey}
                draggable
                onDragStart={(e) => onSectionDragStart(e, idx)}
                onDragOver={(e) => onSectionDragOver(e, idx)}
                onDrop={() => onSectionDrop(idx)}
                onDragEnd={onSectionDragEnd}
                className={`transition-all ${dragIdx === idx ? 'opacity-30 scale-95' : ''}`}
              >
                {/* Drop indicator: dashed box */}
                {isOver && (
                  <div className="h-9 rounded-lg border-2 border-dashed border-[var(--d360-orange)] mb-1 mx-1 bg-[rgba(255,106,0,0.06)] flex items-center justify-center">
                    <span className="text-[9px] text-[var(--d360-orange)]/60 font-mono uppercase tracking-widest">Drop here</span>
                  </div>
                )}

                {/* Section header */}
                <div className="flex items-center h-7 gap-1 group/sec select-none">
                  <div
                    className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-secondary/40 transition-colors shrink-0"
                    onMouseDown={() => { gripAllowedRef.current = true }}
                    onMouseUp={() => { gripAllowedRef.current = false }}
                  >
                    <GripIcon className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/sec:text-muted-foreground/60 transition-colors" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--d360-orange)] font-bold font-mono flex-1 min-w-0 truncate">{sec.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(sectionKey) }}
                    className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                    title={isCollapsed ? 'Show section' : 'Hide section'}
                  >
                    <EyeIcon open={!isCollapsed} className="w-3.5 h-3.5" />
                  </button>
                </div>
                {!isCollapsed && <div className="mt-0.5">{content}</div>}
              </div>
            )
          })}

          {/* Bottom drop zone for dragging to last position */}
          {dragIdx !== null && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(store.sectionOrder.length) }}
              onDrop={() => {
                if (dragIdx === null) return
                const order = [...store.sectionOrder]
                const [moved] = order.splice(dragIdx, 1)
                order.push(moved)
                store.setSectionOrder(order)
                setDragIdx(null)
                setDragOverIdx(null)
              }}
              className={`h-9 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${
                dragOverIdx === store.sectionOrder.length
                  ? 'border-[var(--d360-orange)] bg-[rgba(255,106,0,0.06)]'
                  : 'border-muted-foreground/20'
              }`}
            >
              <span className="text-[9px] text-muted-foreground/40 font-mono uppercase tracking-widest">Drop here</span>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

/* ===== Streams section ===== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StreamsSection({ store, menuOpenId, setMenuOpenId }: { store: any; menuOpenId: string | null; setMenuOpenId: (id: string | null) => void }) {
  const streamKeys = useMemo(() => Object.keys(store.streams), [store.streams])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const gripRef = useRef(false)

  function onStart(e: React.DragEvent, idx: number) {
    if (!gripRef.current) { e.preventDefault(); return }
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'stream')
    setDragIdx(idx)
  }
  function onOver(e: React.DragEvent, idx: number) {
    if (dragIdx === null) return
    e.preventDefault()
    e.stopPropagation()
    setDragOverIdx(idx)
  }
  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.stopPropagation()
    if (dragIdx !== null && dragIdx !== idx) store.reorderStreams(dragIdx, idx)
    setDragIdx(null); setDragOverIdx(null); gripRef.current = false
  }
  function onEnd(e: React.DragEvent) {
    e.stopPropagation()
    setDragIdx(null); setDragOverIdx(null); gripRef.current = false
  }

  return (
    <>
      {streamKeys.length === 0 && (
        <p className="text-[11px] text-muted-foreground px-2 py-1 font-mono">No streams yet</p>
      )}
      {streamKeys.map((name, idx) => {
        const isOver = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx
        return (
          <div
            key={name}
            draggable
            onDragStart={(e) => onStart(e, idx)}
            onDragOver={(e) => onOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onEnd}
            className={`transition-all ${dragIdx === idx ? 'opacity-30 scale-95' : ''}`}
          >
            {isOver && <div className="h-9 rounded-lg border-2 border-dashed border-[var(--d360-orange)] mb-0.5 mx-1 bg-[rgba(255,106,0,0.06)] flex items-center justify-center"><span className="text-[9px] text-[var(--d360-orange)]/60 font-mono uppercase tracking-widest">Drop here</span></div>}
            <StreamItem
              name={name}
              stream={store.streams[name]}
              store={store}
              isActive={store.currentView.type === 'stream' && store.currentView.id === name}
              gripRef={gripRef}
              menuOpenId={menuOpenId}
              setMenuOpenId={setMenuOpenId}
            />
          </div>
        )
      })}

      {/* Bottom drop zone for streams */}
      {dragIdx !== null && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverIdx(streamKeys.length) }}
          onDrop={(e) => {
            e.preventDefault(); e.stopPropagation()
            if (dragIdx !== null && dragIdx !== streamKeys.length) store.reorderStreams(dragIdx, streamKeys.length - 1)
            setDragIdx(null); setDragOverIdx(null); gripRef.current = false
          }}
          className={`h-7 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${
            dragOverIdx === streamKeys.length
              ? 'border-[var(--d360-orange)] bg-[rgba(255,106,0,0.06)]'
              : 'border-muted-foreground/15'
          }`}
        >
          <span className="text-[9px] text-muted-foreground/30 font-mono">Drop here</span>
        </div>
      )}

      <button
        onClick={() => store.setConfigOpen(true)}
        className="text-[10px] uppercase tracking-widest text-[var(--d360-orange)] hover:text-[var(--d360-orange)]/80 mt-1 px-2 font-mono font-semibold"
      >
        + Create Stream
      </button>
    </>
  )
}

/* ===== Stream Item ===== */
function StreamItem({ name, stream, store, isActive, gripRef, menuOpenId, setMenuOpenId }: {
  name: string
  stream: { ids: string[]; sound: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any
  isActive: boolean
  gripRef: React.MutableRefObject<boolean>
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
}) {
  const [showMembers, setShowMembers] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const menu = usePortalMenu()

  const displayName = store.getStreamDisplayName(name)
  const isRenamed = !!store.streamRenames[name]
  const streamId = `stream__${name}`
  const isHighlighted = isActive || menuOpenId === streamId

  // Sync menu open state to highlight
  useEffect(() => {
    if (menu.open) setMenuOpenId(streamId)
    else if (menuOpenId === streamId) setMenuOpenId(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.open])

  const groupNames = useMemo(() => {
    return stream.ids.map((id: string) => {
      const g = store.groups.find((gr: { id: string }) => gr.id === id)
      return g ? g.name : id
    })
  }, [stream.ids, store.groups])

  useEffect(() => {
    if (!showMembers) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (popoverRef.current?.contains(target)) return
      setShowMembers(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMembers])

  function openMemberPopover() {
    if (menu.btnRef.current) {
      const rect = menu.btnRef.current.getBoundingClientRect()
      const left = rect.right + 8
      const adjustedLeft = left + 250 > window.innerWidth ? rect.left - 258 : left
      setPopoverPos({ top: Math.max(8, rect.top - 20), left: adjustedLeft })
    }
    setShowMembers(true)
    menu.close()
  }

  function openEditStream() {
    store.setEditingStream({ name, ids: stream.ids, sound: stream.sound as SoundName })
    store.setConfigOpen(true)
    menu.close()
  }

  function startRename() {
    setRenameVal(displayName)
    setRenaming(true)
    menu.close()
  }
  function confirmRename() {
    if (renameVal.trim() && renameVal.trim() !== name) store.renameStream(name, renameVal.trim())
    else store.clearStreamRename(name)
    setRenaming(false)
  }

  return (
    <div className="relative group mb-0.5">
      <div className="flex items-center gap-1">
        <div
          className="cursor-grab active:cursor-grabbing p-0.5 shrink-0 rounded hover:bg-secondary/30 transition-colors"
          onMouseDown={() => { gripRef.current = true }}
          onMouseUp={() => { gripRef.current = false }}
        >
          <GripIcon className="w-3 h-3 text-muted-foreground/20" />
        </div>

        <button
          onClick={(e) => {
            if (e.shiftKey) store.openSecondaryPanel('stream', name)
            else store.switchView('stream', name)
          }}
          className={`flex-1 flex items-center gap-2 px-2 py-3 rounded-lg text-[13px] font-mono uppercase tracking-wider transition-all min-w-0 ${
            isHighlighted ? 'text-foreground font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/50'
          }`}
          style={isHighlighted ? {
            background: 'linear-gradient(90deg, rgba(255,106,0,0.35) 0%, rgba(255,106,0,0.08) 50%, transparent 100%)',
            borderLeft: '3px solid var(--d360-orange)',
          } : { borderLeft: '3px solid transparent' }}
        >
          {renaming ? (
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenaming(false) }}
              onBlur={confirmRename}
              onClick={e => e.stopPropagation()}
              className="w-full text-[13px] font-mono bg-secondary/60 border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            />
          ) : (
            <span className="truncate">{displayName}</span>
          )}
        </button>

        <button
          ref={menu.btnRef}
          onClick={menu.toggle}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <DotsVIcon className="w-5 h-5" />
        </button>
        {menu.open && typeof document !== 'undefined' && createPortal(
          <div
            ref={menu.menuRef}
            className="fixed bg-card border border-border rounded-lg shadow-2xl py-1 min-w-[180px]"
            style={{ top: menu.pos.top, left: menu.pos.left, zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={openEditStream} className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2">
              <EditIcon className="w-3.5 h-3.5" /> Edit stream
            </button>
            <button onClick={openMemberPopover} className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2">
              <InfoIcon className="w-3.5 h-3.5" /> View groups
            </button>
            <button onClick={startRename} className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2">
              <EditIcon className="w-3.5 h-3.5" /> Rename
            </button>
            {isRenamed && (
              <button onClick={() => { store.clearStreamRename(name); menu.close() }} className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 font-mono">Reset name</button>
            )}
            <button onClick={() => { playSound(stream.sound as SoundName); menu.close() }} className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2">
              <SoundIcon className="w-3.5 h-3.5" /> Preview sound
            </button>
            <div className="border-t border-border my-1" />
            <button onClick={() => { store.deleteStream(name); menu.close() }} className="w-full text-left px-3 py-2 text-xs text-[var(--d360-red)] hover:bg-secondary/60 font-mono">Delete</button>
          </div>,
          document.body
        )}

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" className="sr-only peer" checked={store.streamToggles.has(name)} onChange={() => store.toggleStreamMonitor(name)} />
          <div className="w-7 h-4 bg-secondary rounded-full peer peer-checked:bg-[var(--d360-orange)] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:w-3 after:h-3 after:transition-all peer-checked:after:translate-x-3" />
        </label>
      </div>

      {showMembers && popoverPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="fixed bg-card border border-border rounded-xl shadow-2xl p-4 min-w-[220px] max-w-[300px]"
          style={{ top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}
        >
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--d360-orange)]" />
            Groups in {displayName}
          </div>
          <div className="flex flex-col gap-2">
            {groupNames.map((gn: string, i: number) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-foreground/90 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--d360-orange)]/60 shrink-0" />
                <span className="truncate">{gn}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ===== Chat Card ===== */
interface ChatItemData {
  type: 'group' | 'dm'
  id: string
  name: string
  ts: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChatCard({ item, store, onClick, isPinned = false, isInactive = false, menuOpenId, setMenuOpenId }: {
  item: ChatItemData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any
  onClick: (e: React.MouseEvent) => void
  isPinned?: boolean
  isInactive?: boolean
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
}) {
  const isSelected = store.currentView.type === item.type && store.currentView.id === item.id
  const isUnread = store.isUnread(item.id, item.ts)
  const isMuted = store.mutedGroups[item.id]
  const displayName = store.getChatDisplayName(item.id, item.name)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [showOriginal, setShowOriginal] = useState(false)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const isRenamed = !!store.chatRenames[item.id]
  const chatSound = store.chatSounds[item.id] as SoundName | undefined

  const isMenuOpen = menuOpenId === item.id
  const menu = usePortalMenu()

  const accent = item.type === 'dm' ? 'var(--d360-cyan)' : 'var(--d360-orange)'

  // Sync menu open to highlight
  useEffect(() => {
    if (menu.open) setMenuOpenId(item.id)
    else if (menuOpenId === item.id) { setMenuOpenId(null); setShowSoundPicker(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.open])

  function startRename() {
    setRenameVal(displayName)
    setRenaming(true)
    menu.close()
  }

  function confirmRename() {
    if (renameVal.trim() && renameVal.trim() !== item.name) store.renameChat(item.id, renameVal.trim())
    else store.clearChatRename(item.id)
    setRenaming(false)
  }

  const isHighlighted = isSelected || isMenuOpen

  return (
    <>
      <div
        onClick={onClick}
        className={`relative flex items-center gap-1.5 px-3 py-3 rounded-lg cursor-pointer transition-all group mb-0.5 overflow-hidden ${
          isHighlighted
            ? 'text-foreground font-semibold'
            : isInactive
              ? 'text-foreground/60 hover:text-foreground/80 hover:bg-secondary/30'
              : 'text-foreground/80 hover:text-foreground hover:bg-secondary/40'
        }`}
        style={isHighlighted ? {
          background: item.type === 'dm'
            ? 'linear-gradient(90deg, rgba(34,211,238,0.30) 0%, rgba(34,211,238,0.08) 50%, transparent 100%)'
            : 'linear-gradient(90deg, rgba(255,106,0,0.35) 0%, rgba(255,106,0,0.08) 50%, transparent 100%)',
        } : {}}
      >
        {/* Left accent bar */}
        {isHighlighted && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r" style={{ background: accent }} />
        )}

        {/* Mute icon - fixed w-5 container, always same position */}
        <div className="w-5 shrink-0 flex items-center justify-center">
          {isMuted ? (
            <button
              onClick={(e) => { e.stopPropagation(); store.toggleMuteGroup(item.id) }}
              className={`p-0.5 transition-colors ${isHighlighted ? 'text-foreground drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]' : 'text-[var(--d360-red)]'} hover:brightness-125`}
              title="Unmute"
            >
              <MuteIcon muted className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); store.toggleMuteGroup(item.id) }}
              className={`p-0.5 transition-all ${
                isHighlighted
                  ? 'text-foreground/80 hover:text-foreground drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] opacity-100'
                  : 'text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100'
              }`}
              title="Mute"
            >
              <MuteIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Title area - takes all remaining space */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenaming(false) }}
              onBlur={confirmRename}
              onClick={e => e.stopPropagation()}
              className="w-full text-[13px] font-mono bg-secondary/60 border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            />
          ) : (
            <>
              <span className={`truncate text-[13px] font-mono tracking-wide block ${isHighlighted ? 'font-bold text-foreground' : isInactive ? 'font-normal' : 'font-medium'}`}>
                {displayName}
              </span>
              {isRenamed && showOriginal && (
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{item.name}</div>
              )}
              {chatSound && (
                <div className="text-[9px] text-muted-foreground/60 font-mono flex items-center gap-1 mt-0.5">
                  <SoundIcon className="w-2.5 h-2.5" /> {chatSound}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: timestamp + unread + dots */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="text-[10px] font-mono"
            style={{
              color: isInactive ? 'var(--color-muted-foreground)' : isHighlighted ? 'var(--color-foreground)' : accent,
              opacity: isInactive ? 0.7 : 0.8,
            }}
          >
            {formatTimeAgo(item.ts)}
          </span>

          {isUnread && !isInactive && (
            <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse-glow" style={{ background: accent }} />
          )}

          <button
            ref={menu.btnRef}
            onClick={(e) => { e.stopPropagation(); menu.toggle(e) }}
            className={`p-0.5 transition-colors shrink-0 ${isHighlighted ? 'text-foreground drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <DotsVIcon className="w-5 h-5" />
          </button>
          {menu.open && typeof document !== 'undefined' && createPortal(
            <div
              ref={menu.menuRef}
              className="fixed bg-card border border-border rounded-lg shadow-2xl py-1 min-w-[200px]"
              style={{ top: menu.pos.top, left: menu.pos.left, zIndex: 9999 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={startRename}
                className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2"
              >
                <EditIcon className="w-3.5 h-3.5" /> Rename
              </button>
              {isRenamed && (
                <>
                  <button
                    onClick={() => { setShowOriginal(!showOriginal); menu.close() }}
                    className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono"
                  >
                    {showOriginal ? 'Hide original' : 'See original'}
                  </button>
                  <button
                    onClick={() => { store.clearChatRename(item.id); menu.close() }}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 font-mono"
                  >
                    Reset name
                  </button>
                </>
              )}
              <button
                onClick={() => { store.togglePinChat(item.id); menu.close() }}
                className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2"
              >
                <PinIcon className="w-3.5 h-3.5" />
                {isPinned || store.pinnedChats[item.id] ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={() => { store.toggleMuteGroup(item.id); menu.close() }}
                className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2"
              >
                <MuteIcon muted={isMuted} className="w-3.5 h-3.5" />
                {isMuted ? 'Unmute' : 'Mute'}
              </button>

              {/* Add Member - groups only */}
              {item.type === 'group' && (
                <button
                  onClick={() => { setShowAddMember(true); menu.close() }}
                  className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" /> Add member
                </button>
              )}

              {/* Sound picker */}
              <button
                onClick={() => setShowSoundPicker(!showSoundPicker)}
                className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2"
              >
                <SoundIcon className="w-3.5 h-3.5" />
                Alert sound {chatSound ? `(${chatSound})` : '(default)'}
                <ChevronIcon open={showSoundPicker} className="w-3 h-3 ml-auto" />
              </button>
              {showSoundPicker && (
                <div className="px-2 py-1 border-t border-border max-h-[200px] overflow-y-auto">
                  {SOUND_NAMES.map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <button
                        onClick={() => { store.setChatSound(item.id, s); menu.close() }}
                        className={`flex-1 text-left px-2 py-1.5 text-[11px] font-mono rounded transition-colors ${
                          chatSound === s ? 'text-[var(--d360-orange)] bg-secondary/60' : 'text-foreground/70 hover:bg-secondary/40'
                        }`}
                      >
                        {s}
                      </button>
                      <button
                        onClick={() => playSound(s)}
                        className="p-1 text-muted-foreground hover:text-[var(--d360-orange)] hover:scale-110 transition-all rounded-full hover:bg-secondary/50"
                        title="Preview"
                      >
                        <PlayCircleIcon className="w-7 h-7" />
                      </button>
                    </div>
                  ))}
                  {chatSound && (
                    <button
                      onClick={() => { store.clearChatSound(item.id); menu.close() }}
                      className="w-full text-left px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground font-mono mt-0.5"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              )}
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Add member modal */}
      {showAddMember && (
        <AddMemberModal groupId={item.id} onClose={() => setShowAddMember(false)} />
      )}
    </>
  )
}
