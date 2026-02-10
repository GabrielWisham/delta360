'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import type { UserStatus } from '@/lib/types'
import {
  Menu,
  Settings,
  Search,
  Users,
  BookUser,
  ClipboardList,
  StickyNote,
  Moon,
  Sun,
  AlignJustify,
  ArrowUpDown,
  ArrowDownUp,
  MousePointerClick,
  Megaphone,
  ClipboardCheck,
  Download,
  FileText,
  LogOut,
  Volume2,
  VolumeOff,
  Truck,
  HelpCircle,
  Hash,
  Pin,
  PinOff,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const MAX_PINS = 4
const PINS_KEY = 'd360_pinned_tools'

type ToolDef = {
  id: string
  label: string
  Icon: LucideIcon
  action: (store: ReturnType<typeof useStore>) => void
}

const ALL_TOOLS: ToolDef[] = [
  { id: 'config', label: 'Config', Icon: Settings, action: s => s.setConfigOpen(true) },
  { id: 'search', label: 'Search', Icon: Search, action: s => s.setSearchOpen(true) },
  { id: 'members', label: 'Members', Icon: Users, action: s => s.setMembersOpen(true) },
  { id: 'contacts', label: 'Contacts', Icon: BookUser, action: s => s.setContactsOpen(true) },
  { id: 'clipboard', label: 'Clipboard', Icon: ClipboardList, action: s => s.setClipboardOpen(!s.clipboardOpen) },
  { id: 'stickies', label: 'Sticky Notes', Icon: StickyNote, action: s => s.setStickyOpen(!s.stickyOpen) },
  { id: 'msgbuilder', label: 'Msg Builder', Icon: Truck, action: s => s.setMsgBuilderOpen(true) },
  { id: 'ordersearch', label: 'Order Search', Icon: Hash, action: s => s.setOrderSearchOpen(true) },
  { id: 'broadcast', label: 'Broadcast', Icon: Megaphone, action: s => s.setAdhocOpen(true) },
  { id: 'shiftchange', label: 'Shift Change', Icon: ClipboardCheck, action: s => s.setShiftChangeOpen(true) },
]

function loadPins(): string[] {
  try {
    const raw = localStorage.getItem(PINS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* empty */ }
  return []
}

function savePins(pins: string[]) {
  localStorage.setItem(PINS_KEY, JSON.stringify(pins))
}

const STATUS_OPTIONS: { value: UserStatus; color: string; label: string }[] = [
  { value: 'avl', color: 'bg-green-500', label: 'Available' },
  { value: 'bsy', color: 'bg-red-500', label: 'Busy' },
  { value: 'awy', color: 'bg-yellow-500', label: 'Away' },
]

export function Header() {
  const store = useStore()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const toolsRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setPinnedIds(loadPins()) }, [])

  const togglePin = useCallback((toolId: string) => {
    setPinnedIds(prev => {
      let next: string[]
      if (prev.includes(toolId)) {
        next = prev.filter(id => id !== toolId)
      } else {
        if (prev.length >= MAX_PINS) return prev
        next = [...prev, toolId]
      }
      savePins(next)
      return next
    })
  }, [])

  const pinnedTools = pinnedIds.map(id => ALL_TOOLS.find(t => t.id === id)).filter(Boolean) as ToolDef[]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(target)) setToolsOpen(false)
      if (viewOpen && viewRef.current && !viewRef.current.contains(target)) setViewOpen(false)
      if (actionsOpen && actionsRef.current && !actionsRef.current.contains(target)) setActionsOpen(false)
      if (statusOpen && statusRef.current && !statusRef.current.contains(target)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [toolsOpen, viewOpen, actionsOpen, statusOpen])

  const currentStatus = STATUS_OPTIONS.find(s => s.value === store.myStatus) || STATUS_OPTIONS[2]

  return (
    <header className="glass sticky top-0 z-50 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 border-b border-border">
      {/* Hamburger / sidebar toggle */}
      <button
        onClick={() => {
          if (window.innerWidth < 640) store.toggleSidebarMobile()
          else store.toggleSidebar()
        }}
        className="p-2 rounded hover:bg-secondary/60 text-foreground"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-1 sm:mr-2 shrink-0">
        <span
          className="text-lg sm:text-xl font-bold"
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
        <div className="relative" ref={toolsRef}>
          <TrayButton label="Tools" open={toolsOpen} onClick={() => { setToolsOpen(!toolsOpen); setViewOpen(false); setActionsOpen(false) }} />
          {toolsOpen && (
            <div className="absolute top-full left-0 mt-1 rounded-lg p-2 min-w-[220px] flex flex-col gap-0.5 z-[60] shadow-xl bg-card border border-border" role="menu">
              {ALL_TOOLS.filter(t => ['config','search','members','contacts','clipboard','stickies','msgbuilder','ordersearch'].includes(t.id)).map(tool => (
                <PinnableItem
                  key={tool.id}
                  tool={tool}
                  isPinned={pinnedIds.includes(tool.id)}
                  canPin={pinnedIds.length < MAX_PINS || pinnedIds.includes(tool.id)}
                  onAction={() => { tool.action(store); setToolsOpen(false) }}
                  onTogglePin={() => togglePin(tool.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* View */}
        <div className="relative" ref={viewRef}>
          <TrayButton label="View" open={viewOpen} onClick={() => { setViewOpen(!viewOpen); setToolsOpen(false); setActionsOpen(false) }} />
          {viewOpen && (
            <div className="absolute top-full left-0 mt-1 rounded-lg p-2 min-w-[200px] flex flex-col gap-1 z-[60] shadow-xl bg-card border border-border" role="menu">
              <TrayItem
                label={`Theme: ${store.theme === 'dark' ? 'Dark' : 'Light'}`}
                Icon={store.theme === 'dark' ? Moon : Sun}
                onClick={() => store.toggleTheme()}
              />
              <TrayItem
                label={`Compact: ${store.compact ? 'ON' : 'OFF'}`}
                Icon={AlignJustify}
                onClick={() => store.toggleCompact()}
              />
              <TrayItem
                label={`Input: ${store.inputBottom ? 'Bottom' : 'Top'}`}
                Icon={ArrowUpDown}
                onClick={() => store.toggleInputBottom()}
              />
              <TrayItem
                label={`Order: ${store.oldestFirst ? 'Oldest' : 'Newest'} First`}
                Icon={ArrowDownUp}
                onClick={() => store.toggleOldestFirst()}
              />
              <TrayItem
                label={`Auto-Scroll: ${store.autoScroll ? 'ON' : 'OFF'}`}
                Icon={MousePointerClick}
                onClick={() => store.setAutoScroll(!store.autoScroll)}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative" ref={actionsRef}>
          <TrayButton label="Actions" open={actionsOpen} onClick={() => { setActionsOpen(!actionsOpen); setToolsOpen(false); setViewOpen(false) }} />
          {actionsOpen && (
            <div className="absolute top-full left-0 mt-1 rounded-lg p-2 min-w-[220px] flex flex-col gap-0.5 z-[60] shadow-xl bg-card border border-border" role="menu">
              {ALL_TOOLS.filter(t => ['broadcast','shiftchange'].includes(t.id)).map(tool => (
                <PinnableItem
                  key={tool.id}
                  tool={tool}
                  isPinned={pinnedIds.includes(tool.id)}
                  canPin={pinnedIds.length < MAX_PINS || pinnedIds.includes(tool.id)}
                  onAction={() => { tool.action(store); setActionsOpen(false) }}
                  onTogglePin={() => togglePin(tool.id)}
                />
              ))}
              <div className="h-px bg-border my-1" />
              <TrayItem label="Export Chat" Icon={Download} onClick={() => { exportChat(store); setActionsOpen(false) }} />
              <TrayItem label="Shift Log" Icon={FileText} onClick={() => { exportShiftLog(store); setActionsOpen(false) }} />
              <TrayItem label="Logout" Icon={LogOut} onClick={() => store.logout()} />
            </div>
          )}
        </div>
      </div>

      {/* Pinned tools */}
      {pinnedTools.length > 0 && (
        <>
          <div className="w-px h-5 bg-border/50 mx-0.5 shrink-0" />
          <div className="flex items-center gap-0.5">
            {pinnedTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => tool.action(store)}
                className="p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-[var(--d360-orange)] transition-colors group relative"
                title={tool.label}
              >
                <tool.Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* Connection indicator */}
      <div className="flex items-center gap-1.5 mr-1 sm:mr-2 shrink-0">
        <div
          className={`w-2 h-2 rounded-full ${store.isConnected ? 'bg-[var(--d360-green)]' : 'bg-muted-foreground'}`}
          style={store.isConnected ? { boxShadow: '0 0 6px var(--d360-green)' } : {}}
        />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          {store.isConnected ? 'Live' : 'Off'}
        </span>
      </div>

      {/* Tutorial */}
      <button
        onClick={() => {
          localStorage.removeItem('d360_tutorial_done')
          window.dispatchEvent(new CustomEvent('d360:show-tutorial'))
        }}
        className="p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
        title="Quick tour"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Global mute */}
      <button
        onClick={() => store.toggleGlobalMute()}
        className="p-1.5 rounded hover:bg-secondary/60 text-foreground"
        title={store.globalMute ? 'Unmute' : 'Mute all sounds'}
      >
        {store.globalMute ? <VolumeOff className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Status dropdown */}
      <div className="relative" ref={statusRef}>
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary/60 text-xs"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`} />
          <span className="hidden sm:inline uppercase tracking-wider text-muted-foreground">{currentStatus.label}</span>
        </button>
        {statusOpen && (
          <div className="absolute top-full right-0 mt-1 rounded-lg p-1 min-w-[140px] z-[60] shadow-xl bg-card border border-border">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => { store.setMyStatus(s.value); setStatusOpen(false) }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-secondary/60 ${
                  store.myStatus === s.value ? 'text-foreground' : 'text-muted-foreground'
                }`}
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
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

function TrayItem({ label, Icon, onClick }: { label: string; Icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs hover:bg-secondary/60 text-foreground transition-colors"
      style={{ fontFamily: 'var(--font-jetbrains)' }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="uppercase tracking-wider">{label}</span>
    </button>
  )
}

function PinnableItem({ tool, isPinned, canPin, onAction, onTogglePin }: {
  tool: ToolDef
  isPinned: boolean
  canPin: boolean
  onAction: () => void
  onTogglePin: () => void
}) {
  return (
    <div className="flex items-center rounded hover:bg-secondary/60 transition-colors group">
      <button
        onClick={onAction}
        role="menuitem"
        className="flex items-center gap-2 flex-1 px-3 py-1.5 text-xs text-foreground"
        style={{ fontFamily: 'var(--font-jetbrains)' }}
      >
        <tool.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="uppercase tracking-wider">{tool.label}</span>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onTogglePin() }}
        className={`p-1.5 mr-1 rounded transition-colors ${
          isPinned
            ? 'text-[var(--d360-orange)] hover:text-[var(--d360-red)]'
            : canPin
              ? 'text-transparent group-hover:text-muted-foreground hover:!text-[var(--d360-orange)]'
              : 'text-transparent group-hover:text-muted-foreground/30 cursor-not-allowed'
        }`}
        title={isPinned ? 'Unpin from toolbar' : canPin ? 'Pin to toolbar' : `Max ${MAX_PINS} pins`}
        disabled={!canPin && !isPinned}
      >
        {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
      </button>
    </div>
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
