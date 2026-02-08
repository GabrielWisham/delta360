'use client'

import { useMemo, useState } from 'react'
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
      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
    </svg>
  )
}
function EditIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function Sidebar() {
  const store = useStore()
  const now = Math.floor(Date.now() / 1000)

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
        <div className="p-3 flex flex-col gap-5">
          {/* COMMAND */}
          <div>
            <SectionLabel text="Command" />
            <NavItem
              label="Universal Feed"
              isActive={store.currentView.type === 'all'}
              accent="var(--d360-orange)"
              onClick={(e) => { if (e.shiftKey) store.openSecondaryPanel('all', null); else store.switchView('all', null) }}
            />
            <NavItem
              label="Direct Comms"
              isActive={store.currentView.type === 'dms'}
              accent="var(--d360-cyan)"
              onClick={(e) => { if (e.shiftKey) store.openSecondaryPanel('dms', null); else store.switchView('dms', null) }}
            />
          </div>

          {/* STREAMS */}
          <div>
            <SectionLabel text="Streams" />
            {Object.keys(store.streams).length === 0 && (
              <p className="text-[11px] text-muted-foreground px-2 py-1 font-mono">No streams yet</p>
            )}
            {Object.entries(store.streams).map(([name, stream]) => (
              <StreamItem
                key={name}
                name={name}
                stream={stream}
                store={store}
                isActive={store.currentView.type === 'stream' && store.currentView.id === name}
              />
            ))}
            <button
              onClick={() => store.setConfigOpen(true)}
              className="text-[10px] uppercase tracking-widest text-[var(--d360-orange)] hover:text-[var(--d360-orange)]/80 mt-1 px-2 font-mono font-semibold"
            >
              + Create Stream
            </button>
          </div>

          {/* PENDING DMs */}
          {pendingDMs.length > 0 && (
            <div>
              <SectionLabel text={`Pending DMs (${pendingDMs.length})`} />
              {pendingDMs.map(d => (
                <div key={d.other_user.id} className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs bg-secondary/50 mb-1">
                  <span className="text-foreground flex-1 truncate font-semibold font-mono">{d.other_user.name}</span>
                  <span className="text-muted-foreground truncate max-w-[80px] text-[10px]">{d.last_message?.text || ''}</span>
                  <button onClick={() => store.approveDM(d.other_user.id)} className="text-[var(--d360-green)] hover:brightness-125 font-bold px-1 text-base" title="Approve">{'\u2713'}</button>
                  <button onClick={() => store.blockDM(d.other_user.id)} className="text-[var(--d360-red)] hover:brightness-125 font-bold px-1 text-base" title="Block">{'\u2715'}</button>
                </div>
              ))}
            </div>
          )}

          {/* PINNED */}
          {pinnedItems.length > 0 && (
            <div>
              <SectionLabel text="Pinned" />
              {pinnedItems.map(item => (
                <ChatCard
                  key={item.id}
                  item={item}
                  store={store}
                  onClick={(e) => handleClick(item.type, item.id, e)}
                  isPinned
                />
              ))}
            </div>
          )}

          {/* ACTIVE */}
          <div>
            <SectionLabel text={`Active${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
            {active.map(item => (
              <ChatCard key={item.id} item={item} store={store} onClick={(e) => handleClick(item.type, item.id, e)} />
            ))}
            {active.length === 0 && <p className="text-[11px] text-muted-foreground px-2 py-2 font-mono">No active chats</p>}
          </div>

          {/* INACTIVE */}
          {inactive.length > 0 && (
            <div>
              <button onClick={() => store.setInactiveOpen(!store.inactiveOpen)} className="flex items-center gap-1 w-full mb-1">
                <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono font-semibold">
                  {store.inactiveOpen ? '\u25BC' : '\u25B6'} Inactive ({inactive.length})
                </span>
              </button>
              {store.inactiveOpen && (
                <div className="flex flex-col gap-0.5">
                  {inactive.map(item => (
                    <ChatCard key={item.id} item={item} store={store} onClick={(e) => handleClick(item.type, item.id, e)} isInactive />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

/* ===== Section Label ===== */
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--d360-orange)] font-bold mb-2 px-2 font-mono">{text}</div>
  )
}

/* ===== Nav Item (Command section) ===== */
function NavItem({ label, isActive, accent, onClick }: { label: string; isActive: boolean; accent: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[13px] font-mono uppercase tracking-wider transition-all mb-0.5 ${
        isActive ? 'text-foreground font-bold' : 'text-foreground/60 hover:text-foreground hover:bg-secondary/50'
      }`}
      style={isActive ? {
        background: `linear-gradient(90deg, ${accent}30 0%, ${accent}05 100%)`,
        borderLeft: `3px solid ${accent}`,
      } : { borderLeft: '3px solid transparent' }}
    >
      {label}
    </button>
  )
}

/* ===== Stream Item with member popover ===== */
function StreamItem({ name, stream, store, isActive }: {
  name: string
  stream: { ids: string[]; sound: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any
  isActive: boolean
}) {
  const [showMembers, setShowMembers] = useState(false)

  const groupNames = useMemo(() => {
    return stream.ids.map(id => {
      const g = store.groups.find((gr: { id: string }) => gr.id === id)
      return g ? g.name : id
    })
  }, [stream.ids, store.groups])

  return (
    <div className="relative group mb-0.5">
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            if (e.shiftKey) store.openSecondaryPanel('stream', name)
            else store.switchView('stream', name)
          }}
          className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-mono uppercase tracking-wider transition-all ${
            isActive ? 'text-foreground font-bold' : 'text-foreground/60 hover:text-foreground hover:bg-secondary/50'
          }`}
          style={isActive ? {
            background: 'linear-gradient(90deg, var(--d360-orange)30 0%, var(--d360-orange)05 100%)',
            borderLeft: '3px solid var(--d360-orange)',
          } : { borderLeft: '3px solid transparent' }}
        >
          {name}
        </button>

        {/* Dots menu for stream members */}
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title="View groups in stream"
        >
          <DotsIcon className="w-4 h-4" />
        </button>

        {/* Sound preview */}
        <button
          onClick={() => playSound(stream.sound as SoundName)}
          className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title="Preview sound"
        >
          <MuteIcon className="w-3.5 h-3.5" />
        </button>

        {/* Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={store.streamToggles.has(name)} onChange={() => store.toggleStreamMonitor(name)} />
          <div className="w-7 h-4 bg-secondary rounded-full peer peer-checked:bg-[var(--d360-orange)] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:w-3 after:h-3 after:transition-all peer-checked:after:translate-x-3" />
        </label>

        {/* Delete */}
        <button
          onClick={() => store.deleteStream(name)}
          className="text-xs text-muted-foreground hover:text-[var(--d360-red)] p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete stream"
        >
          {'\u2715'}
        </button>
      </div>

      {/* Member popover */}
      {showMembers && (
        <div className="absolute left-8 top-full z-50 mt-1 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">Groups in {name}</div>
          <div className="flex flex-col gap-1.5">
            {groupNames.map((gn, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                <div className="w-2 h-2 rounded-full bg-[var(--d360-orange)]" />
                <span className="truncate font-mono">{gn}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowMembers(false)} className="mt-2 text-[10px] text-muted-foreground hover:text-foreground font-mono">Close</button>
        </div>
      )}
    </div>
  )
}

/* ===== Chat Card - Larger with rename, gradient, modern icons ===== */
interface ChatItemData {
  type: 'group' | 'dm'
  id: string
  name: string
  ts: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChatCard({ item, store, onClick, isPinned = false, isInactive = false }: {
  item: ChatItemData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any
  onClick: (e: React.MouseEvent) => void
  isPinned?: boolean
  isInactive?: boolean
}) {
  const isSelected = store.currentView.type === item.type && store.currentView.id === item.id
  const isUnread = store.isUnread(item.id, item.ts)
  const isMuted = store.mutedGroups[item.id]
  const displayName = store.getChatDisplayName(item.id, item.name)
  const isRenamed = store.chatRenames[item.id]
  const [showOriginal, setShowOriginal] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')

  const accent = item.type === 'dm' ? 'var(--d360-cyan)' : 'var(--d360-orange)'

  function startRename(e: React.MouseEvent) {
    e.stopPropagation()
    setRenameVal(displayName)
    setRenaming(true)
  }

  function confirmRename() {
    if (renameVal.trim() && renameVal.trim() !== item.name) {
      store.renameChat(item.id, renameVal.trim())
    } else {
      store.clearChatRename(item.id)
    }
    setRenaming(false)
  }

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-3 rounded-lg cursor-pointer transition-all group mb-0.5 overflow-hidden ${
        isSelected
          ? 'text-foreground font-semibold'
          : isInactive
            ? 'text-foreground/55 hover:text-foreground/80 hover:bg-secondary/30'
            : 'text-foreground/80 hover:text-foreground hover:bg-secondary/40'
      }`}
      style={isSelected ? {
        background: `linear-gradient(90deg, ${accent}35 0%, ${accent}08 60%, transparent 100%)`,
      } : {}}
    >
      {/* Left accent bar with gradient */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r"
          style={{ background: accent }}
        />
      )}

      {/* Unread dot */}
      {isUnread && !isInactive && (
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse-glow"
          style={{ background: accent, color: accent }}
        />
      )}

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
            <div className="flex items-center gap-1.5">
              {isMuted && <MuteIcon muted className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
              {isPinned && <PinIcon filled className="w-3 h-3 text-[var(--d360-yellow)] shrink-0" />}
              <span className={`truncate text-[13px] font-mono tracking-wide ${isSelected ? 'font-bold' : isInactive ? 'font-normal' : 'font-medium'}`}>
                {displayName}
              </span>
              {isRenamed && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOriginal(!showOriginal) }}
                  className="text-[9px] text-muted-foreground hover:text-foreground shrink-0 font-mono"
                  title="Show original name"
                >
                  {showOriginal ? 'hide' : 'orig'}
                </button>
              )}
            </div>
            {showOriginal && isRenamed && (
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate pl-1">
                {item.name}
              </div>
            )}
          </>
        )}
      </div>

      {/* Timestamp */}
      <span
        className="text-[10px] shrink-0 min-w-[32px] text-right font-mono"
        style={{
          color: isInactive ? 'var(--color-muted-foreground)' : accent,
          opacity: isInactive ? 0.6 : 0.8,
        }}
      >
        {formatTimeAgo(item.ts)}
      </span>

      {/* Action buttons - always rendered but hidden until hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {/* Rename */}
        <button
          onClick={startRename}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          title="Rename chat"
        >
          <EditIcon className="w-3.5 h-3.5" />
        </button>
        {/* Pin/Unpin */}
        <button
          onClick={(e) => { e.stopPropagation(); store.togglePinChat(item.id) }}
          className={`p-1 rounded ${store.pinnedChats[item.id] ? 'text-[var(--d360-yellow)]' : 'text-muted-foreground hover:text-foreground'}`}
          title={store.pinnedChats[item.id] ? 'Unpin' : 'Pin'}
        >
          <PinIcon filled={!!store.pinnedChats[item.id]} className="w-4 h-4" />
        </button>
        {/* Mute */}
        {item.type === 'group' && (
          <button
            onClick={(e) => { e.stopPropagation(); store.toggleMuteGroup(item.id) }}
            className={`p-1 rounded ${isMuted ? 'text-[var(--d360-red)]' : 'text-muted-foreground hover:text-foreground'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <MuteIcon muted={!!isMuted} className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
