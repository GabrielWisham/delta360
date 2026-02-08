'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { formatTimeAgo, getHeat, getLastMsgTs } from '@/lib/date-helpers'
import { playSound } from '@/lib/sounds'
import type { SoundName } from '@/lib/types'

const SIX_HOURS = 21600

export function Sidebar() {
  const store = useStore()
  const now = Math.floor(Date.now() / 1000)

  const sortedGroups = useMemo(() => {
    const items = store.groups.map(g => ({
      type: 'group' as const,
      id: g.id,
      name: g.name,
      ts: getLastMsgTs(g),
      heat: getHeat(getLastMsgTs(g), now),
      imageUrl: g.image_url,
    }))
    const dmItems = store.dmChats
      .filter(d => store.approved[d.other_user?.id] !== false)
      .map(d => ({
        type: 'dm' as const,
        id: d.other_user?.id || '',
        name: d.other_user?.name || 'DM',
        ts: d.updated_at,
        heat: getHeat(d.updated_at, now),
        imageUrl: d.other_user?.avatar_url,
      }))
    return [...items, ...dmItems]
  }, [store.groups, store.dmChats, store.approved, now])

  const active = useMemo(() => {
    const list = sortedGroups.filter(i => (now - i.ts) < SIX_HOURS)
    return store.sortMode === 'heat'
      ? list.sort((a, b) => b.heat - a.heat)
      : list.sort((a, b) => b.ts - a.ts)
  }, [sortedGroups, store.sortMode, now])

  const inactive = useMemo(() => {
    return sortedGroups.filter(i => (now - i.ts) >= SIX_HOURS).sort((a, b) => b.ts - a.ts)
  }, [sortedGroups, now])

  const pendingDMs = useMemo(() => {
    return store.dmChats.filter(d => {
      const uid = d.other_user?.id
      return uid && store.approved[uid] === undefined
    })
  }, [store.dmChats, store.approved])

  const pinnedItems = useMemo(() => {
    return sortedGroups.filter(i => store.pinnedChats[i.id]).sort((a, b) => b.ts - a.ts)
  }, [sortedGroups, store.pinnedChats])

  const unreadCount = active.filter(i => store.isUnread(i.id, i.ts)).length

  function handleClick(type: 'group' | 'dm', id: string, e: React.MouseEvent) {
    if (e.shiftKey) {
      store.openSecondaryPanel(type, id)
    } else {
      store.switchView(type, id)
    }
  }

  const isDesktopHidden = store.sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth > 600

  return (
    <>
      {/* Mobile overlay backdrop */}
      {store.sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => store.toggleSidebarMobile()}
        />
      )}

      <aside
        className={`
          flex flex-col border-r border-border overflow-y-auto overflow-x-hidden
          transition-all duration-300 ease-in-out shrink-0
          ${store.sidebarMobileOpen
            ? 'fixed inset-y-0 left-0 z-40 w-[290px] bg-background shadow-2xl translate-x-0'
            : 'fixed inset-y-0 left-0 z-40 w-[290px] bg-background shadow-2xl -translate-x-full md:translate-x-0 md:static md:shadow-none'
          }
          ${isDesktopHidden ? 'md:w-0 md:border-r-0 md:overflow-hidden' : 'md:w-[290px]'}
        `}
        style={{ background: 'var(--d360-sidebar-bg)' }}
      >
        <div className="p-3 flex flex-col gap-4">
          {/* COMMAND SECTION */}
          <div>
            <SectionLabel text="Command" />
            <SidebarItem
              label="Universal Feed"
              icon={'\u{1F30D}'}
              isActive={store.currentView.type === 'all'}
              accentColor="var(--d360-orange)"
              onClick={(e) => {
                if (e.shiftKey) store.openSecondaryPanel('all', null)
                else store.switchView('all', null)
              }}
            />
            <SidebarItem
              label="Direct Comms"
              icon={'\u{1F4AC}'}
              isActive={store.currentView.type === 'dms'}
              accentColor="var(--d360-cyan)"
              onClick={(e) => {
                if (e.shiftKey) store.openSecondaryPanel('dms', null)
                else store.switchView('dms', null)
              }}
            />
          </div>

          {/* STREAMS SECTION */}
          {Object.keys(store.streams).length > 0 && (
            <div>
              <SectionLabel text="Streams" />
              {Object.entries(store.streams).map(([name, stream]) => (
                <div key={name} className="flex items-center gap-1 group">
                  <SidebarItem
                    label={name}
                    icon={'\u{1F4FB}'}
                    isActive={store.currentView.type === 'stream' && store.currentView.id === name}
                    accentColor="var(--d360-orange)"
                    onClick={(e) => {
                      if (e.shiftKey) store.openSecondaryPanel('stream', name)
                      else store.switchView('stream', name)
                    }}
                    className="flex-1"
                  />
                  <button
                    onClick={() => playSound(stream.sound as SoundName)}
                    className="text-xs text-muted-foreground hover:text-foreground p-0.5"
                    title={`Preview: ${stream.sound}`}
                  >
                    {'\u{1F50A}'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={store.streamToggles.has(name)}
                      onChange={() => store.toggleStreamMonitor(name)}
                    />
                    <div className="w-7 h-4 bg-secondary rounded-full peer peer-checked:bg-[var(--d360-orange)] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-foreground after:rounded-full after:w-3 after:h-3 after:transition-all peer-checked:after:translate-x-3" />
                  </label>
                  <button
                    onClick={() => store.deleteStream(name)}
                    className="text-xs text-muted-foreground hover:text-[var(--d360-red)] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete stream"
                  >
                    {'\u2715'}
                  </button>
                </div>
              ))}
              <button
                onClick={() => store.setConfigOpen(true)}
                className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[var(--d360-orange)] mt-1 px-2"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                + Add Stream
              </button>
            </div>
          )}

          {/* PENDING DMs */}
          {pendingDMs.length > 0 && (
            <div>
              <SectionLabel text={`Pending DMs (${pendingDMs.length})`} />
              {pendingDMs.map(d => (
                <div key={d.other_user.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs">
                  <span className="text-foreground flex-1 truncate" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {d.other_user.name}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[60px] text-[10px]">
                    {d.last_message?.text || ''}
                  </span>
                  <button
                    onClick={() => store.approveDM(d.other_user.id)}
                    className="text-[var(--d360-green)] hover:brightness-125 text-sm"
                    title="Approve"
                  >
                    {'\u2713'}
                  </button>
                  <button
                    onClick={() => store.blockDM(d.other_user.id)}
                    className="text-[var(--d360-red)] hover:brightness-125 text-sm"
                    title="Block"
                  >
                    {'\u2715'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* PINNED CHATS */}
          {pinnedItems.length > 0 && (
            <div>
              <SectionLabel text="Pinned" />
              {pinnedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-secondary/40 border-l-2"
                  style={{ borderLeftColor: 'var(--d360-yellow)' }}
                  onClick={(e) => handleClick(item.type, item.id, e)}
                >
                  <span className="text-[10px]">{'\u{1F4CC}'}</span>
                  <span className="text-foreground truncate flex-1" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ACTIVE SECTION */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <SectionLabel text={`Active${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
              <div className="flex gap-1">
                <button
                  onClick={() => store.setSortMode('recent')}
                  className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    store.sortMode === 'recent' ? 'text-[var(--d360-orange)]' : 'text-muted-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  Recent
                </button>
                <button
                  onClick={() => store.setSortMode('heat')}
                  className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    store.sortMode === 'heat' ? 'text-[var(--d360-orange)]' : 'text-muted-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  Heat
                </button>
              </div>
            </div>
            {active.map(item => (
              <ChatItem
                key={item.id}
                item={item}
                now={now}
                store={store}
                onClick={(e) => handleClick(item.type, item.id, e)}
              />
            ))}
            {active.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-2" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                No active chats
              </p>
            )}
          </div>

          {/* INACTIVE SECTION */}
          {inactive.length > 0 && (
            <div>
              <button
                onClick={() => store.setInactiveOpen(!store.inactiveOpen)}
                className="flex items-center gap-1 w-full"
              >
                <span
                  className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  {store.inactiveOpen ? '\u25BC' : '\u25B6'} Inactive ({inactive.length})
                </span>
              </button>
              {store.inactiveOpen && (
                <div className="opacity-40 mt-1">
                  {inactive.map(item => (
                    <ChatItem
                      key={item.id}
                      item={item}
                      now={now}
                      store={store}
                      onClick={(e) => handleClick(item.type, item.id, e)}
                    />
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

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 px-2"
      style={{ fontFamily: 'var(--font-jetbrains)' }}
    >
      {text}
    </div>
  )
}

function SidebarItem({
  label, icon, isActive, accentColor, onClick, className = '',
}: {
  label: string; icon: string; isActive: boolean; accentColor: string;
  onClick: (e: React.MouseEvent) => void; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-all ${
        isActive
          ? 'border-l-2 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
      } ${className}`}
      style={isActive ? {
        borderLeftColor: accentColor,
        background: `linear-gradient(90deg, ${accentColor}18, transparent)`,
        fontFamily: 'var(--font-jetbrains)',
      } : { fontFamily: 'var(--font-jetbrains)' }}
    >
      <span>{icon}</span>
      <span className="truncate uppercase tracking-wider">{label}</span>
    </button>
  )
}

interface ChatItemData {
  type: 'group' | 'dm'
  id: string
  name: string
  ts: number
  heat: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChatItem({ item, now, store, onClick }: { item: ChatItemData; now: number; store: any; onClick: (e: React.MouseEvent) => void }) {
  const isActive = (store.currentView.type === item.type && store.currentView.id === item.id)
  const isUnread = store.isUnread(item.id, item.ts)
  const isMuted = store.mutedGroups[item.id]
  const accentColor = item.type === 'dm' ? 'var(--d360-cyan)' : 'var(--d360-orange)'

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all group ${
        isActive ? 'border-l-2 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
      }`}
      style={isActive ? {
        borderLeftColor: accentColor,
        background: `linear-gradient(90deg, ${accentColor}18, transparent)`,
      } : {}}
    >
      {/* Unread dot */}
      {isUnread && (
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse-glow"
          style={{ background: accentColor, color: accentColor }}
        />
      )}

      <span className="truncate flex-1 uppercase tracking-wider" style={{ fontFamily: 'var(--font-jetbrains)' }}>
        {isMuted && <span className="opacity-40">{'\u{1F507}'} </span>}
        {item.name}
      </span>

      {/* Heat bar */}
      <div className="w-8 h-0.5 rounded-full bg-secondary overflow-hidden shrink-0">
        <div
          className="heat-bar"
          style={{
            width: `${item.heat}%`,
            background: item.heat > 70 ? 'var(--d360-orange)' : item.heat > 30 ? 'var(--d360-yellow)' : 'var(--d360-green)',
          }}
        />
      </div>

      <span className="text-[9px] text-muted-foreground shrink-0" style={{ fontFamily: 'var(--font-jetbrains)' }}>
        {formatTimeAgo(item.ts)}
      </span>

      {/* Pin and mute buttons */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); store.togglePinChat(item.id) }}
          className={`text-[10px] p-0.5 ${store.pinnedChats[item.id] ? 'text-[var(--d360-yellow)]' : 'text-muted-foreground hover:text-foreground'}`}
          title="Pin chat"
        >
          {'\u2606'}
        </button>
        {item.type === 'group' && (
          <button
            onClick={(e) => { e.stopPropagation(); store.toggleMuteGroup(item.id) }}
            className={`text-[10px] p-0.5 ${isMuted ? 'text-[var(--d360-red)]' : 'text-muted-foreground hover:text-foreground'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '\u{1F507}' : '\u{1F508}'}
          </button>
        )}
      </div>
    </div>
  )
}
