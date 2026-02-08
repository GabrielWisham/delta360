'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { UserStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: UserStatus; icon: string; label: string }[] = [
  { value: 'avl', icon: '\u{1F7E2}', label: 'Available' },
  { value: 'bsy', icon: '\u{1F534}', label: 'Busy' },
  { value: 'awy', icon: '\u{1F7E1}', label: 'Away' },
]

export function Header() {
  const store = useStore()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const trayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (trayRef.current && !trayRef.current.contains(e.target as Node)) {
        setToolsOpen(false)
        setViewOpen(false)
        setActionsOpen(false)
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentStatus = STATUS_OPTIONS.find(s => s.value === store.myStatus) || STATUS_OPTIONS[2]

  return (
    <header className="glass sticky top-0 z-50 flex items-center gap-2 px-3 py-2 border-b border-border" ref={trayRef}>
      {/* Hamburger / sidebar toggle */}
      <button
        onClick={() => {
          if (window.innerWidth < 640) store.toggleSidebarMobile()
          else store.toggleSidebar()
        }}
        className="p-1.5 rounded hover:bg-secondary/60 text-foreground text-sm"
        aria-label="Toggle sidebar"
        style={{ fontFamily: 'var(--font-jetbrains)' }}
      >
        {'\u2630'}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-2">
        <span
          className="text-xl font-bold"
          style={{
            fontFamily: 'var(--font-jetbrains)',
            background: 'var(--d360-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {'\u0394'}360
        </span>
      </div>

      {/* Tray buttons - each in own relative container for proper dropdown alignment */}
      <div className="flex items-center gap-1">
        {/* Tools */}
        <div className="relative">
          <TrayButton label="Tools" open={toolsOpen} onClick={() => { setToolsOpen(!toolsOpen); setViewOpen(false); setActionsOpen(false) }} />
          {toolsOpen && (
            <div className="absolute top-full left-0 mt-1 rounded-lg p-2 min-w-[180px] flex flex-col gap-1 z-50 shadow-xl bg-card border border-border" role="menu">
              <TrayItem label="Config" icon="\u2699" onClick={() => { store.setConfigOpen(true); setToolsOpen(false) }} />
              <TrayItem label="Search" icon="\u{1F50D}" onClick={() => { store.setSearchOpen(true); setToolsOpen(false) }} />
              <TrayItem label="Members" icon="\u{1F465}" onClick={() => { store.setMembersOpen(true); setToolsOpen(false) }} />
              <TrayItem label="Contacts" icon="\u{1F4D2}" onClick={() => { store.setContactsOpen(true); setToolsOpen(false) }} />
              <TrayItem label="Clipboard" icon="\u{1F4CB}" onClick={() => { store.setClipboardOpen(!store.clipboardOpen); setToolsOpen(false) }} />
              <TrayItem label="Sticky Notes" icon="\u{1F4D2}" onClick={() => { store.setStickyOpen(!store.stickyOpen); setToolsOpen(false) }} />
            </div>
          )}
        </div>

        {/* View */}
        <div className="relative">
          <TrayButton label="View" open={viewOpen} onClick={() => { setViewOpen(!viewOpen); setToolsOpen(false); setActionsOpen(false) }} />
          {viewOpen && (
            <div className="absolute top-full left-0 mt-1 rounded-lg p-2 min-w-[200px] flex flex-col gap-1 z-50 shadow-xl bg-card border border-border" role="menu">
              <TrayItem
                label={`Theme: ${store.theme === 'dark' ? 'Dark' : 'Light'}`}
                icon={store.theme === 'dark' ? '\u{1F319}' : '\u2600'}
                onClick={() => store.toggleTheme()}
              />
              <TrayItem
                label={`Compact: ${store.compact ? 'ON' : 'OFF'}`}
                icon="\u{1F5DC}"
                onClick={() => store.toggleCompact()}
              />
              <TrayItem
                label={`Input: ${store.inputBottom ? 'Bottom' : 'Top'}`}
                icon="\u2B06"
                onClick={() => store.toggleInputBottom()}
              />
              <TrayItem
                label={`Order: ${store.oldestFirst ? 'Oldest' : 'Newest'} First`}
                icon="\u{1F503}"
                onClick={() => store.toggleOldestFirst()}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative">
          <TrayButton label="Actions" open={actionsOpen} onClick={() => { setActionsOpen(!actionsOpen); setToolsOpen(false); setViewOpen(false) }} />
          {actionsOpen && (
            <div className="absolute top-full left-0 mt-1 rounded-lg p-2 min-w-[200px] flex flex-col gap-1 z-50 shadow-xl bg-card border border-border" role="menu">
              <TrayItem label="Broadcast" icon="\u{1F4E2}" onClick={() => { store.setAdhocOpen(true); setActionsOpen(false) }} />
              <TrayItem label="Shift Change" icon="\u{1F4CB}" onClick={() => { store.setShiftChangeOpen(true); setActionsOpen(false) }} />
              <TrayItem label="Export Chat" icon="\u{1F4BE}" onClick={() => { exportChat(store); setActionsOpen(false) }} />
              <TrayItem label="Shift Log" icon="\u{1F4C4}" onClick={() => { exportShiftLog(store); setActionsOpen(false) }} />
              <TrayItem label="Logout" icon="\u{1F6AA}" onClick={() => store.logout()} />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Connection indicator */}
      <div className="flex items-center gap-1.5 mr-2">
        <div
          className={`w-2 h-2 rounded-full ${store.isConnected ? 'bg-[var(--d360-green)]' : 'bg-muted-foreground'}`}
          style={store.isConnected ? { boxShadow: '0 0 6px var(--d360-green)' } : {}}
        />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          {store.isConnected ? 'Live' : 'Off'}
        </span>
      </div>

      {/* Global mute */}
      <button
        onClick={() => store.toggleGlobalMute()}
        className="p-1.5 rounded hover:bg-secondary/60 text-sm"
        title={store.globalMute ? 'Unmute' : 'Mute all sounds'}
      >
        {store.globalMute ? '\u{1F507}' : '\u{1F50A}'}
      </button>

      {/* Status dropdown */}
      <div className="relative">
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary/60 text-xs"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          <span>{currentStatus.icon}</span>
          <span className="hidden sm:inline uppercase tracking-wider text-muted-foreground">{currentStatus.label}</span>
        </button>
        {statusOpen && (
          <div className="absolute top-full right-0 mt-1 rounded-lg p-1 min-w-[140px] z-50 shadow-xl bg-card border border-border">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => { store.setMyStatus(s.value); setStatusOpen(false) }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-secondary/60 ${
                  store.myStatus === s.value ? 'text-foreground' : 'text-muted-foreground'
                }`}
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                <span>{s.icon}</span>
                <span className="uppercase tracking-wider">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User info */}
      {store.user && (
        <span
          className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline ml-1"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          {store.user.name}
        </span>
      )}
    </header>
  )
}

function TrayButton({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-haspopup="true"
      aria-expanded={open}
      className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-widest transition-colors ${
        open
          ? 'text-[var(--d360-orange)] bg-secondary/60'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
      }`}
      style={{ fontFamily: 'var(--font-jetbrains)' }}
    >
      {label}
    </button>
  )
}

function TrayItem({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-secondary/60 text-foreground transition-colors"
      style={{ fontFamily: 'var(--font-jetbrains)' }}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="uppercase tracking-wider">{label}</span>
    </button>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportChat(store: any) {
  const msgs = store.panelMessages[0] || []
  if (!msgs.length) { store.showToast('Export', 'No messages to export'); return }
  const lines = msgs.map((m: { name: string; created_at: number; text: string | null }) => {
    const d = new Date(m.created_at * 1000).toLocaleString()
    return `[${d}] ${m.name}: ${m.text || '(attachment)'}`
  })
  const title = store.getPanelTitle(store.currentView.type, store.currentView.id)
  const blob = new Blob([`Export: ${title}\n${new Date().toLocaleString()}\n\n${lines.join('\n')}`], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `delta360-export-${Date.now()}.txt`
  a.click()
  store.showToast('Export', 'Chat exported')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exportShiftLog(store: any) {
  const now = new Date().toLocaleString()
  const status = store.myStatus === 'avl' ? 'Available' : store.myStatus === 'bsy' ? 'Busy' : 'Away'
  const view = store.getPanelTitle(store.currentView.type, store.currentView.id)
  const pinCount = Object.keys(store.pinnedMessages).length
  const stickyCount = Object.keys(store.stickies).length
  const activeGroups = store.groups
    .filter((g: { messages?: { last_message_created_at?: number } }) => {
      const ts = g.messages?.last_message_created_at || 0
      return (Date.now() / 1000 - ts) < 21600
    })
    .map((g: { name: string }) => g.name)
    .join(', ')

  const log = [
    `=== DELTA 360 SHIFT LOG ===`,
    `Time: ${now}`,
    `Operator: ${store.user?.name || 'Unknown'}`,
    `Status: ${status}`,
    `Current View: ${view}`,
    `Active Groups: ${activeGroups || 'None'}`,
    `Pinned Messages: ${pinCount}`,
    `Sticky Notes: ${stickyCount}`,
  ].join('\n')

  const blob = new Blob([log], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `delta360-shiftlog-${Date.now()}.txt`
  a.click()
  store.showToast('Log', 'Shift log exported')
}
