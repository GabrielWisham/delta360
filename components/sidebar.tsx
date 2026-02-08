'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'
import { formatTimeAgo, getLastMsgTs } from '@/lib/date-helpers'
import { playSound } from '@/lib/sounds'
import type { SoundName } from '@/lib/types'

const FOUR_HOURS = 14400

/* ===== SVG Icons ===== */
function PinIcon({ filled, className = '' }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
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
function DotsIcon({ className = '' }: { className?: string }) {
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
function ArchiveIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" /><path d="M10 12h4" />
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

/* ===== usePortalMenu - positions a dropdown portaled to body ===== */
function usePortalMenu() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + 2,
        left: Math.min(rect.right - 140, window.innerWidth - 160),
      })
    }
    setOpen(prev => !prev)
  }, [open])

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return { open, pos, btnRef, toggle, close: () => setOpen(false) }
}

export function Sidebar() {
  const store = useStore()
  const now = Math.floor(Date.now() / 1000)

  /* Section-level drag state */
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  /* Collapsed sections */
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const toggleCollapse = useCallback((key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  /* Active dots-menu chat ID for highlighting */
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  /* Mute keys for Universal Feed and DMs hub */
  const feedMuted = !!store.mutedGroups['__universal_feed__']
  const dmsMuted = !!store.mutedGroups['__direct_comms__']

  const sortedGroups = useMemo(() => {
    const items = store.groups.map(g => ({
      type: 'group' as const,
      id: g.id,
      name: g.name,
      ts: getLastMsgTs(g),
      imageUrl: g.image_url,
    }))
    const dmItems = store.dmChats
      .filter(d => store.approved[d.other_user?.id] !== false)
      .map(d => ({
        type: 'dm' as const,
        id: d.other_user?.id || '',
        name: d.other_user?.name || 'DM',
        ts: d.updated_at,
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

  function handleClick(type: 'group' | 'dm', id: string, e: React.MouseEvent) {
    if (e.shiftKey) store.openSecondaryPanel(type, id)
    else store.switchView(type, id)
  }

  const isDesktopHidden = store.sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth > 600

  /* Section drag handlers */
  function onDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'section')
    setDragIdx(idx)
  }
  function onDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOverIdx(idx) }
  function onDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
    const order = [...store.sectionOrder]
    const [moved] = order.splice(dragIdx, 1)
    order.splice(idx, 0, moved)
    store.setSectionOrder(order)
    setDragIdx(null)
    setDragOverIdx(null)
  }
  function onDragEnd() { setDragIdx(null); setDragOverIdx(null) }

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
              onClick={(e) => { e.stopPropagation(); store.toggleMuteGroup('__universal_feed__') }}
              className={`p-1 shrink-0 transition-colors ${feedMuted ? 'text-[var(--d360-red)]/70 hover:text-[var(--d360-red)]' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
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
              onClick={(e) => { e.stopPropagation(); store.toggleMuteGroup('__direct_comms__') }}
              className={`p-1 shrink-0 transition-colors ${dmsMuted ? 'text-[var(--d360-red)]/70 hover:text-[var(--d360-red)]' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
              title={dmsMuted ? 'Unmute DMs' : 'Mute DMs'}
            >
              <MuteIcon muted={dmsMuted} className="w-4 h-4" />
            </button>
          </div>
        </>
      ),
    },

    streams: {
      label: 'Streams',
      render: () => <StreamsSection store={store} />,
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
        <>
          <button onClick={() => store.setInactiveOpen(!store.inactiveOpen)} className="flex items-center gap-1.5 w-full mb-1 px-1">
            <ChevronIcon open={store.inactiveOpen} className="w-3.5 h-3.5 text-muted-foreground" />
            <ArchiveIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono font-semibold">
              Expand ({inactive.length})
            </span>
          </button>
          {store.inactiveOpen && (
            <div className="flex flex-col gap-0.5">
              {inactive.map(item => (
                <ChatCard key={item.id} item={item} store={store} onClick={(e) => handleClick(item.type, item.id, e)} isInactive menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />
              ))}
            </div>
          )}
        </>
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
        <div className="p-3 flex flex-col gap-3">
          {store.sectionOrder.map((sectionKey, idx) => {
            const sec = sections[sectionKey]
            if (!sec) return null
            const isCollapsed = collapsedSections[sectionKey] ?? false
            const content = sec.render()
            if (!content && sectionKey !== 'command') return null

            return (
              <div
                key={sectionKey}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                className={`transition-all ${dragOverIdx === idx ? 'border-t-2 border-[var(--d360-orange)] pt-1' : ''}`}
              >
                {/* Section header */}
                <div className="flex items-center gap-1.5 mb-1 cursor-grab active:cursor-grabbing group/sec select-none">
                  <GripIcon className="w-3 h-3 text-muted-foreground/30 group-hover/sec:text-muted-foreground/60 transition-colors shrink-0" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--d360-orange)] font-bold font-mono flex-1 min-w-0 truncate">{sec.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(sectionKey) }}
                    className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                    title={isCollapsed ? 'Show section' : 'Hide section'}
                  >
                    <EyeIcon open={!isCollapsed} className="w-3.5 h-3.5" />
                  </button>
                </div>
                {!isCollapsed && content}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}

/* ===== Streams section with proper drag reorder ===== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StreamsSection({ store }: { store: any }) {
  const streamKeys = useMemo(() => Object.keys(store.streams), [store.streams])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  function onStart(e: React.DragEvent, idx: number) {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'stream')
    setDragIdx(idx)
  }
  function onOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.getData('text/plain') === 'section') return
    setDragOverIdx(idx)
  }
  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.stopPropagation()
    if (dragIdx !== null && dragIdx !== idx) {
      store.reorderStreams(dragIdx, idx)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }
  function onEnd(e: React.DragEvent) {
    e.stopPropagation()
    setDragIdx(null)
    setDragOverIdx(null)
  }

  return (
    <>
      {streamKeys.length === 0 && (
        <p className="text-[11px] text-muted-foreground px-2 py-1 font-mono">No streams yet</p>
      )}
      {streamKeys.map((name, idx) => (
        <div
          key={name}
          draggable
          onDragStart={(e) => onStart(e, idx)}
          onDragOver={(e) => onOver(e, idx)}
          onDrop={(e) => onDrop(e, idx)}
          onDragEnd={onEnd}
          className={`transition-all ${dragOverIdx === idx ? 'border-t-2 border-[var(--d360-orange)] pt-0.5' : ''} ${dragIdx === idx ? 'opacity-40' : ''}`}
        >
          <StreamItem
            name={name}
            stream={store.streams[name]}
            store={store}
            isActive={store.currentView.type === 'stream' && store.currentView.id === name}
          />
        </div>
      ))}
      <button
        onClick={() => store.setConfigOpen(true)}
        className="text-[10px] uppercase tracking-widest text-[var(--d360-orange)] hover:text-[var(--d360-orange)]/80 mt-1 px-2 font-mono font-semibold"
      >
        + Create Stream
      </button>
    </>
  )
}

/* ===== Stream Item with member popover + edit + rename ===== */
function StreamItem({ name, stream, store, isActive }: {
  name: string
  stream: { ids: string[]; sound: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any
  isActive: boolean
}) {
  const [showMembers, setShowMembers] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const memberBtnRef = useRef<HTMLButtonElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const menu = usePortalMenu()

  const displayName = store.getStreamDisplayName(name)
  const isRenamed = !!store.streamRenames[name]

  const groupNames = useMemo(() => {
    return stream.ids.map((id: string) => {
      const g = store.groups.find((gr: { id: string }) => gr.id === id)
      return g ? g.name : id
    })
  }, [stream.ids, store.groups])

  // Click outside to close members popover
  useEffect(() => {
    if (!showMembers) return
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target as Element)?.closest?.('[data-stream-popover]') && !memberBtnRef.current?.contains(e.target as Node)) {
        setShowMembers(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMembers])

  function openMemberPopover() {
    if (memberBtnRef.current) {
      const rect = memberBtnRef.current.getBoundingClientRect()
      setPopoverPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 260) })
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
    if (renameVal.trim() && renameVal.trim() !== name) {
      store.renameStream(name, renameVal.trim())
    } else {
      store.clearStreamRename(name)
    }
    setRenaming(false)
  }

  return (
    <div className="relative group mb-0.5">
      <div className="flex items-center gap-1">
        {/* Drag grip */}
        <GripIcon className="w-3 h-3 text-muted-foreground/20 cursor-grab shrink-0" />

        <button
          onClick={(e) => {
            if (e.shiftKey) store.openSecondaryPanel('stream', name)
            else store.switchView('stream', name)
          }}
          className={`flex-1 flex items-center gap-2 px-2 py-3 rounded-lg text-[13px] font-mono uppercase tracking-wider transition-all min-w-0 ${
            isActive ? 'text-foreground font-bold' : 'text-foreground/70 hover:text-foreground hover:bg-secondary/50'
          }`}
          style={isActive ? {
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

        {/* View members */}
        <button
          ref={memberBtnRef}
          onClick={(e) => { e.stopPropagation(); showMembers ? setShowMembers(false) : openMemberPopover() }}
          className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
          title="View groups"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <circle cx="6" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18" cy="12" r="2" />
          </svg>
        </button>

        {/* Dots menu */}
        <button
          ref={menu.btnRef}
          onClick={menu.toggle}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <DotsIcon className="w-5 h-5" />
        </button>
        {menu.open && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed bg-card border border-border rounded-lg shadow-2xl py-1 min-w-[150px]"
            style={{ top: menu.pos.top, left: menu.pos.left, zIndex: 9999 }}
          >
            <button onClick={openEditStream} className="w-full text-left px-3 py-1.5 text-xs text-foreground/80 hover:bg-secondary/60 font-mono flex items-center gap-2">
              <EditIcon className="w-3.5 h-3.5" /> Edit stream
            </button>
            <button onClick={openMemberPopover} className="w-full text-left px-3 py-1.5 text-xs text-foreground/80 hover:bg-secondary/60 font-mono">View groups</button>
            <button onClick={startRename} className="w-full text-left px-3 py-1.5 text-xs text-foreground/80 hover:bg-secondary/60 font-mono">Rename</button>
            {isRenamed && (
              <button onClick={() => { store.clearStreamRename(name); menu.close() }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60 font-mono">Reset name</button>
            )}
            <button onClick={() => { playSound(stream.sound as SoundName); menu.close() }} className="w-full text-left px-3 py-1.5 text-xs text-foreground/80 hover:bg-secondary/60 font-mono">Preview sound</button>
            <button onClick={() => { store.deleteStream(name); menu.close() }} className="w-full text-left px-3 py-1.5 text-xs text-[var(--d360-red)] hover:bg-secondary/60 font-mono">Delete</button>
          </div>,
          document.body
        )}

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" className="sr-only peer" checked={store.streamToggles.has(name)} onChange={() => store.toggleStreamMonitor(name)} />
          <div className="w-7 h-4 bg-secondary rounded-full peer peer-checked:bg-[var(--d360-orange)] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:w-3 after:h-3 after:transition-all peer-checked:after:translate-x-3" />
        </label>
      </div>

      {/* Members popover - portaled to body */}
      {showMembers && popoverPos && typeof document !== 'undefined' && createPortal(
        <div
          data-stream-popover
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
  const isRenamed = !!store.chatRenames[item.id]

  const isMenuOpen = menuOpenId === item.id
  const menu = usePortalMenu()

  const accent = item.type === 'dm' ? 'var(--d360-cyan)' : 'var(--d360-orange)'

  // Sync portal menu open state with parent highlight
  useEffect(() => {
    if (menu.open) setMenuOpenId(item.id)
    else if (menuOpenId === item.id) setMenuOpenId(null)
  }, [menu.open, item.id, menuOpenId, setMenuOpenId])

  function confirmRename() {
    if (renameVal.trim() && renameVal.trim() !== item.name) {
      store.renameChat(item.id, renameVal.trim())
    } else {
      store.clearChatRename(item.id)
    }
    setRenaming(false)
  }

  const isHighlighted = isSelected || isMenuOpen

  return (
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

      {/* Mute icon - fixed position */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); store.toggleMuteGroup(item.id) }}
          className={`p-0.5 transition-colors ${
            isMuted
              ? 'text-[var(--d360-red)]/70 hover:text-[var(--d360-red)]'
              : 'text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
          style={isMuted ? { opacity: 1 } : undefined}
        >
          <MuteIcon muted={!!isMuted} className="w-4 h-4" />
        </button>
      </div>

      {/* Title area */}
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
          </>
        )}
      </div>

      {/* RIGHT: timestamp + unread + dots */}
      <div className="flex items-center gap-1.5 shrink-0">
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

        {/* Dots menu - ALWAYS visible, portaled to body */}
        <button
          ref={menu.btnRef}
          onClick={menu.toggle}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <DotsIcon className="w-5 h-5" />
        </button>
        {menu.open && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed bg-card border border-border rounded-lg shadow-2xl py-1 min-w-[140px]"
            style={{ top: menu.pos.top, left: menu.pos.left, zIndex: 9999 }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setRenameVal(displayName); setRenaming(true); menu.close() }}
              className="w-full text-left px-3 py-1.5 text-xs text-foreground/80 hover:bg-secondary/60 font-mono"
            >
              Rename
            </button>
            {isRenamed && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOriginal(!showOriginal); menu.close() }}
                  className="w-full text-left px-3 py-1.5 text-xs text-foreground/80 hover:bg-secondary/60 font-mono"
                >
                  {showOriginal ? 'Hide original' : 'See original'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); store.clearChatRename(item.id); menu.close() }}
                  className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60 font-mono"
                >
                  Reset name
                </button>
              </>
            )}
            {!isPinned && (
              <button
                onClick={(e) => { e.stopPropagation(); store.togglePinChat(item.id); menu.close() }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground/80 hover:bg-secondary/60 font-mono"
              >
                {store.pinnedChats[item.id] ? 'Unpin' : 'Pin'}
              </button>
            )}
            {isPinned && (
              <button
                onClick={(e) => { e.stopPropagation(); store.togglePinChat(item.id); menu.close() }}
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--d360-red)] hover:bg-secondary/60 font-mono"
              >
                Unpin
              </button>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}
