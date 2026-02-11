'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { playSound } from '@/lib/sounds'
import { SOUND_NAMES } from '@/lib/types'
import type { SoundName } from '@/lib/types'
import {
  X,
  Radio,
  MessageSquareText,
  Bell,
  Volume2,
  Play,
  Plus,
  Trash2,
  Check,
  VolumeOff,
  Search,
  Palette,
  RotateCcw,
  Keyboard,
} from 'lucide-react'
import { SHORTCUT_DEFS, formatBinding, type ShortcutAction } from '@/lib/store'

type Tab = 'streams' | 'templates' | 'alerts' | 'audio' | 'shortcuts' | 'theme'

const TABS: { key: Tab; label: string; Icon: typeof Radio }[] = [
  { key: 'streams', label: 'Streams', Icon: Radio },
  { key: 'templates', label: 'Templates', Icon: MessageSquareText },
  { key: 'alerts', label: 'Alerts', Icon: Bell },
  { key: 'audio', label: 'Audio', Icon: Volume2 },
  { key: 'shortcuts', label: 'Keys', Icon: Keyboard },
  { key: 'theme', label: 'Theme', Icon: Palette },
]

export function ConfigPanel() {
  const store = useStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>((store.configTab as Tab) || 'streams')

  // Sync tab when opened with a specific tab
  useEffect(() => {
    if (store.configTab) setActiveTab(store.configTab as Tab)
  }, [store.configTab])

  // Stream builder state
  const [streamName, setStreamName] = useState('')
  const [streamSound, setStreamSound] = useState<SoundName>('radar')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [isEditing, setIsEditing] = useState(false)

  // Template state
  const [newTemplate, setNewTemplate] = useState('')

  // Alert word state
  const [newAlert, setNewAlert] = useState('')

  // Prefill when editing an existing stream
  useEffect(() => {
    if (store.editingStream) {
      setStreamName(store.editingStream.name)
      setStreamSound(store.editingStream.sound)
      setSelectedGroups(new Set(store.editingStream.ids))
      setIsEditing(true)
      setActiveTab('streams')
      store.setEditingStream(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.editingStream])

  // Reset fields on fresh open
  const wasOpen = useRef(false)
  useEffect(() => {
    if (!wasOpen.current) {
      setStreamName('')
      setStreamSound('radar')
      setSelectedGroups(new Set())
      setIsEditing(false)
    }
    wasOpen.current = true
  }, [])

  // Close on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') store.setConfigOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  function handleSaveStream() {
    if (!streamName.trim() || selectedGroups.size === 0) return
    store.saveStream(streamName.trim().toUpperCase(), Array.from(selectedGroups), streamSound)
    const msg = isEditing ? `Stream "${streamName.trim()}" updated` : `Stream "${streamName.trim()}" created`
    setStreamName('')
    setSelectedGroups(new Set())
    setIsEditing(false)
    store.showToast('Saved', msg)
  }

  const toggleGroup = useCallback((id: string) => {
  setSelectedGroups(prev => {
  const next = new Set(prev)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
    })
  }, [])

  function addTemplate() {
    if (!newTemplate.trim()) return
    store.setTemplates([...store.templates, newTemplate.trim()])
    setNewTemplate('')
  }

  function removeTemplate(idx: number) {
    store.setTemplates(store.templates.filter((_, i) => i !== idx))
  }

  function addAlertWord() {
    if (!newAlert.trim()) return
    store.setAlertWords([...store.alertWords, newAlert.trim().toLowerCase()])
    setNewAlert('')
  }

  function removeAlertWord(idx: number) {
    store.setAlertWords(store.alertWords.filter((_, i) => i !== idx))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={() => store.setConfigOpen(false)}
      />

      {/* Modal */}
      <div
        ref={panelRef}
        className="relative w-full max-w-[560px] h-[min(88vh,800px)] max-sm:h-[100dvh] max-sm:max-w-full max-sm:rounded-none mx-4 max-sm:mx-0 rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <h2
            className="text-xs uppercase tracking-[0.2em] text-foreground font-semibold"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Settings
          </h2>
          <button
            onClick={() => store.setConfigOpen(false)}
            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-5 pt-3 pb-0 gap-1" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] uppercase tracking-widest transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'text-[var(--d360-orange)] border-[var(--d360-orange)] bg-secondary/40'
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/20'
              }`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <tab.Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-border" />

        {/* Tab content */}
        <div className="flex-1 min-h-0 px-5 py-4 overflow-y-auto" role="tabpanel">
          {activeTab === 'streams' && (
            <StreamsTab
              streamName={streamName}
              setStreamName={setStreamName}
              streamSound={streamSound}
              setStreamSound={setStreamSound}
              selectedGroups={selectedGroups}
              toggleGroup={toggleGroup}
              groups={store.groups}
              isEditing={isEditing}
              onSave={handleSaveStream}
            />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab
              templates={store.templates}
              newTemplate={newTemplate}
              setNewTemplate={setNewTemplate}
              addTemplate={addTemplate}
              removeTemplate={removeTemplate}
            />
          )}
          {activeTab === 'alerts' && (
            <AlertsTab
              alertWords={store.alertWords}
              newAlert={newAlert}
              setNewAlert={setNewAlert}
              addAlertWord={addAlertWord}
              removeAlertWord={removeAlertWord}
            />
          )}
          {activeTab === 'audio' && <AudioTab store={store} />}
          {activeTab === 'shortcuts' && <ShortcutsTab store={store} />}
          {activeTab === 'theme' && <ThemeTab store={store} />}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Streams                                                       */
/* ------------------------------------------------------------------ */
function StreamsTab({
  streamName, setStreamName, streamSound, setStreamSound,
  selectedGroups, toggleGroup, groups, isEditing, onSave,
}: {
  streamName: string
  setStreamName: (v: string) => void
  streamSound: SoundName
  setStreamSound: (v: SoundName) => void
  selectedGroups: Set<string>
  toggleGroup: (id: string) => void
  groups: { id: string; name: string }[]
  isEditing: boolean
  onSave: () => void
}) {
  const [groupFilter, setGroupFilter] = useState('')
  const groupListRef = useRef<HTMLDivElement>(null)

  const sortedGroups = useMemo(() =>
    groups
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(g => g.name.toLowerCase().includes(groupFilter.toLowerCase())),
    [groups, groupFilter]
  )

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <SectionLabel>Stream Name</SectionLabel>
      <input
        value={streamName}
        onChange={e => setStreamName(e.target.value)}
        placeholder="e.g. NORTH ZONE"
        className="w-full text-sm bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)] transition-shadow"
        style={{ fontFamily: 'var(--font-mono)' }}
      />

      <SectionLabel>Notification Sound</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {SOUND_NAMES.map(s => (
          <button
            key={s}
            onClick={() => setStreamSound(s)}
            className={`group flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-all ${
              streamSound === s
                ? 'border-[var(--d360-orange)] text-[var(--d360-orange)] bg-[var(--d360-orange-glow)]'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {s}
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); playSound(s) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); playSound(s) } }}
              className="opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
            </span>
          </button>
        ))}
      </div>

      <SectionLabel>Groups ({selectedGroups.size} selected)</SectionLabel>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          placeholder="Search groups..."
          className="w-full text-xs bg-secondary/30 border border-border rounded-lg pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>

      {/* Group list fills remaining space */}
      <div ref={groupListRef} className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border bg-secondary/20">
        {sortedGroups.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No groups match your search.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {sortedGroups.map(g => {
              const checked = selectedGroups.has(g.id)
              return (
                <div
                  key={g.id}
                  role="checkbox"
                  aria-checked={checked}
                  tabIndex={0}
                  onClick={() => toggleGroup(g.id)}
                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleGroup(g.id) } }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors select-none ${
                    checked ? 'bg-[var(--d360-orange-glow)]' : 'hover:bg-secondary/40'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    checked
                      ? 'bg-[var(--d360-orange)] border-[var(--d360-orange)]'
                      : 'border-muted-foreground/40'
                  }`}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate text-foreground">{g.name}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={onSave}
        disabled={!streamName.trim() || selectedGroups.size === 0}
        className="w-full text-xs font-semibold uppercase tracking-widest text-white py-2.5 rounded-lg disabled:opacity-30 transition-all hover:brightness-110"
        style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
      >
        {isEditing ? 'Update Stream' : 'Create Stream'}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Templates                                                     */
/* ------------------------------------------------------------------ */
function TemplatesTab({
  templates, newTemplate, setNewTemplate, addTemplate, removeTemplate,
}: {
  templates: string[]
  newTemplate: string
  setNewTemplate: (v: string) => void
  addTemplate: () => void
  removeTemplate: (i: number) => void
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Quick-reply templates</SectionLabel>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Pre-written messages you can send with one click from the message input area.
      </p>

      {templates.length > 0 ? (
        <div className="rounded-lg border border-border bg-secondary/20 divide-y divide-border/50">
          {templates.map((t, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 group">
              <span className="flex-1 text-xs text-foreground whitespace-pre-wrap break-words" style={{ fontFamily: 'var(--font-mono)' }}>{t}</span>
              <button
                onClick={() => removeTemplate(i)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          No templates yet. Add one below.
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={el => {
            if (el) {
              const panel = el.closest('[role="tabpanel"]')
              const maxH = panel ? panel.clientHeight - 60 : 400
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, maxH) + 'px'
            }
          }}
          value={newTemplate}
          onChange={e => setNewTemplate(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              addTemplate()
            }
          }}
          rows={1}
          placeholder="Type a template... (Shift+Enter for new line)"
          className="flex-1 text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)] resize-none overflow-hidden"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        <button
          onClick={addTemplate}
          disabled={!newTemplate.trim()}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg bg-[var(--d360-orange)] text-white hover:brightness-110 disabled:opacity-30 transition-all shrink-0"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Alerts                                                        */
/* ------------------------------------------------------------------ */
function AlertsTab({
  alertWords, newAlert, setNewAlert, addAlertWord, removeAlertWord,
}: {
  alertWords: string[]
  newAlert: string
  setNewAlert: (v: string) => void
  addAlertWord: () => void
  removeAlertWord: (i: number) => void
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Priority alert words</SectionLabel>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Messages containing these words will be visually highlighted and trigger a priority notification sound.
      </p>

      {alertWords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {alertWords.map((w, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-destructive/40 text-destructive bg-destructive/5"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {w}
              <button
                onClick={() => removeAlertWord(i)}
                className="hover:text-destructive/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          No alert words set. Add one below.
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newAlert}
          onChange={e => setNewAlert(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addAlertWord()}
          placeholder="e.g. urgent, emergency..."
          className="flex-1 text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-destructive/50"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        <button
          onClick={addAlertWord}
          disabled={!newAlert.trim()}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg bg-destructive text-destructive-foreground hover:brightness-110 disabled:opacity-30 transition-all"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Audio                                                         */
/* ------------------------------------------------------------------ */
function AudioTab({ store }: { store: ReturnType<typeof useStore> }) {
  return (
    <div className="space-y-5">
      <SectionLabel>Global</SectionLabel>

      {/* All Notifications toggle */}
      <label className="flex items-center justify-between cursor-pointer group rounded-lg border border-border bg-secondary/20 px-4 py-3">
        <div>
          <span className="text-xs text-foreground font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
            All Notifications
          </span>
          <p className="text-[10px] text-muted-foreground mt-0.5">Play a sound for every incoming message</p>
        </div>
        <div className={`w-9 h-5 rounded-full relative transition-colors ${store.allNotif ? 'bg-[var(--d360-orange)]' : 'bg-muted'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${store.allNotif ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <input
          type="checkbox"
          checked={store.allNotif}
          onChange={e => store.setAllNotif(e.target.checked)}
          className="sr-only"
        />
      </label>

      <div className="border-t border-border" />

      {/* Feed sound */}
      <SectionLabel>Feed Sound</SectionLabel>
      <SoundRow
        value={store.feedSound}
        onChange={v => store.setFeedSound(v)}
        muted={store.feedMuted}
        onMute={v => store.setFeedMuted(v)}
      />

      <div className="border-t border-border" />

      {/* DM sound */}
      <SectionLabel>DM Sound</SectionLabel>
      <SoundRow
        value={store.dmSound}
        onChange={v => store.setDmSound(v)}
        muted={store.dmMuted}
        onMute={v => store.setDmMuted(v)}
      />

      <div className="border-t border-border" />

      {/* Unified Streams sound */}
      <SectionLabel>Unified Streams Sound</SectionLabel>
      <SoundRow
        value={store.unifiedSound}
        onChange={v => store.setUnifiedSound(v)}
        muted={store.unifiedMuted}
        onMute={v => store.setUnifiedMuted(v)}
      />

      <div className="border-t border-border" />

      {/* Navigation behavior */}
      <SectionLabel>Navigation</SectionLabel>
      <label className="flex items-center justify-between cursor-pointer group rounded-lg border border-border bg-secondary/20 px-4 py-3">
        <div>
          <span className="text-xs text-foreground font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
            Jump to Unread
          </span>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            When entering a chat with unread messages, scroll to the first unread instead of the most recent
          </p>
        </div>
        <div className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ml-3 ${store.jumpToUnread ? 'bg-[var(--d360-orange)]' : 'bg-muted'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${store.jumpToUnread ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <input
          type="checkbox"
          checked={store.jumpToUnread}
          onChange={e => store.setJumpToUnread(e.target.checked)}
          className="sr-only"
        />
      </label>

      <div className="border-t border-border" />

      {/* Test notification */}
      <SectionLabel>Diagnostics</SectionLabel>
      <button
        onClick={() => store.testNotification()}
        className="w-full rounded-lg border border-[var(--d360-orange)] bg-[var(--d360-orange)]/10 px-4 py-3 text-left hover:bg-[var(--d360-orange)]/20 transition-colors"
      >
        <span className="text-xs font-bold text-[var(--d360-orange)]" style={{ fontFamily: 'var(--font-mono)' }}>
          Test Notification
        </span>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Fires a test sound + toast right now. If you hear a chime and see a toast, notifications are working.
        </p>
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Shortcuts                                                     */
/* ------------------------------------------------------------------ */
function ShortcutsTab({ store }: { store: ReturnType<typeof useStore> }) {
  const [recording, setRecording] = useState<ShortcutAction | null>(null)

  // Capture the next keystroke when in recording mode
  useEffect(() => {
    if (!recording) return
    function handleKey(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()

      // Escape cancels recording
      if (e.key === 'Escape') { setRecording(null); return }

      // Ignore bare modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

      // Build binding string
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.metaKey) parts.push('Meta')
      if (e.shiftKey) parts.push('Shift')

      // Normalize key
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
      parts.push(key)

      const binding = parts.join('+')

      // Check for conflicts with other shortcuts
      const conflicting = SHORTCUT_DEFS.find(def => {
        if (def.action === recording) return false
        const existing = store.getShortcutBinding(def.action)
        return existing.toLowerCase() === binding.toLowerCase()
      })

      if (conflicting) {
        store.showToast('Conflict', `"${binding}" is already used by "${conflicting.label}"`)
        setRecording(null)
        return
      }

      store.setShortcutBinding(recording!, binding)
      setRecording(null)
    }

    // Use capture to intercept before any other handler
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [recording, store])

  // Group shortcuts by category
  const categories = Array.from(new Set(SHORTCUT_DEFS.map(d => d.category)))

  return (
    <div className="space-y-5 pr-1">
      <div className="flex items-center justify-between">
        <SectionLabel>Keyboard shortcuts</SectionLabel>
        <button
          onClick={() => { store.resetAllShortcuts(); store.showToast('Reset', 'All shortcuts restored to defaults') }}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <RotateCcw className="w-3 h-3" />
          Reset All
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Click a key binding to reassign it. Press any key or combination to set the new shortcut. Press Escape to cancel.
      </p>

      {categories.map(cat => {
        const defs = SHORTCUT_DEFS.filter(d => d.category === cat)
        return (
          <div key={cat} className="space-y-1.5">
            <h5
              className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold pt-1"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {cat}
            </h5>
            <div className="rounded-lg border border-border bg-secondary/20 divide-y divide-border/50">
              {defs.map(def => {
                const currentBinding = store.getShortcutBinding(def.action)
                const isDefault = currentBinding === def.defaultKey
                const isRecordingThis = recording === def.action

                return (
                  <div
                    key={def.action}
                    className="flex items-center justify-between px-3 py-2.5 group"
                  >
                    {/* Label */}
                    <span
                      className="text-xs text-foreground"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {def.label}
                    </span>

                    {/* Binding + controls */}
                    <div className="flex items-center gap-2">
                      {/* Reset button (only if customized) */}
                      {!isDefault && !isRecordingThis && (
                        <button
                          onClick={() => store.resetShortcut(def.action)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all"
                          title={`Reset to ${formatBinding(def.defaultKey)}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}

                      {/* Binding badge */}
                      <button
                        onClick={() => setRecording(isRecordingThis ? null : def.action)}
                        className={`min-w-[64px] text-center text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                          isRecordingThis
                            ? 'border-[var(--d360-orange)] bg-[var(--d360-orange)]/15 text-[var(--d360-orange)] animate-pulse'
                            : isDefault
                              ? 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                              : 'border-[var(--d360-orange)]/50 bg-[var(--d360-orange)]/5 text-[var(--d360-orange)] hover:border-[var(--d360-orange)]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                        title={isRecordingThis ? 'Press a key... (Esc to cancel)' : 'Click to rebind'}
                      >
                        {isRecordingThis ? 'Press key...' : formatBinding(currentBinding)}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </h4>
  )
}

function SoundRow({
  value, onChange, muted, onMute,
}: {
  value: SoundName
  onChange: (v: SoundName) => void
  muted: boolean
  onMute: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={e => onChange(e.target.value as SoundName)}
        className="flex-1 text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {SOUND_NAMES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button
        onClick={() => playSound(value)}
        className="p-2 rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
        title="Preview"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
      </button>
      <button
        onClick={() => onMute(!muted)}
        className={`p-2 rounded-lg hover:bg-secondary/40 transition-colors ${
          muted ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
        }`}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Theme                                                         */
/* ------------------------------------------------------------------ */

const PRESETS: { name: string; start: [number, number, number]; end: [number, number, number]; angle: number }[] = [
  { name: 'Midnight', start: [15, 23, 42], end: [30, 41, 59], angle: 180 },
  { name: 'Deep Ocean', start: [10, 25, 47], end: [17, 46, 81], angle: 180 },
  { name: 'Ember', start: [40, 15, 10], end: [60, 25, 15], angle: 180 },
  { name: 'Forest', start: [12, 30, 20], end: [20, 45, 30], angle: 180 },
  { name: 'Slate', start: [30, 32, 38], end: [45, 48, 55], angle: 180 },
  { name: 'Ultraviolet', start: [20, 10, 40], end: [40, 20, 65], angle: 180 },
  { name: 'Charcoal', start: [25, 25, 28], end: [40, 40, 44], angle: 180 },
  { name: 'Warm Sand', start: [50, 42, 30], end: [65, 55, 40], angle: 180 },
]

type RGB = [number, number, number]

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function ThemeTab({ store }: { store: ReturnType<typeof useStore> }) {
  const grad = store.boardGradient
  const [start, setStart] = useState<RGB>(grad?.start ?? [15, 23, 42])
  const [end, setEnd] = useState<RGB>(grad?.end ?? [30, 41, 59])
  const [angle, setAngle] = useState(grad?.angle ?? 180)

  function apply(s: RGB, e: RGB, a: number) {
    setStart(s)
    setEnd(e)
    setAngle(a)
    store.setBoardGradient({ start: s, end: e, angle: a })
  }

  function reset() {
    setStart([15, 23, 42])
    setEnd([30, 41, 59])
    setAngle(180)
    store.setBoardGradient(null)
  }

  const previewGrad = `linear-gradient(${angle}deg, rgb(${start.join(',')}), rgb(${end.join(',')}))`

  return (
    <div className="space-y-5 pr-2">
      <SectionLabel>Board Gradient</SectionLabel>

      {/* Live preview */}
      <div
        className="w-full h-16 rounded-lg border border-border overflow-hidden relative"
        style={{ background: previewGrad }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
            Preview
          </span>
        </div>
      </div>

      {/* Presets */}
      <SectionLabel>Presets</SectionLabel>
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.name}
            onClick={() => apply(p.start, p.end, p.angle)}
            className="group flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-secondary/40 transition-colors"
          >
            <div
              className="w-full h-6 rounded border border-border"
              style={{ background: `linear-gradient(${p.angle}deg, rgb(${p.start.join(',')}), rgb(${p.end.join(',')}))` }}
            />
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
              {p.name}
            </span>
          </button>
        ))}
      </div>

      {/* Color pickers + sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <SectionLabel>Start Color</SectionLabel>
          <input
            type="color"
            value={rgbToHex(...start)}
            onChange={e => { const c = hexToRgb(e.target.value); apply(c, end, angle) }}
            className="w-full h-8 rounded-lg border border-border cursor-pointer bg-transparent"
          />
          <RGBSliders rgb={start} onChange={c => apply(c, end, angle)} />
        </div>
        <div className="space-y-2">
          <SectionLabel>End Color</SectionLabel>
          <input
            type="color"
            value={rgbToHex(...end)}
            onChange={e => { const c = hexToRgb(e.target.value); apply(start, c, angle) }}
            className="w-full h-8 rounded-lg border border-border cursor-pointer bg-transparent"
          />
          <RGBSliders rgb={end} onChange={c => apply(start, c, angle)} />
        </div>
      </div>

      {/* Angle slider */}
      <div className="space-y-2">
        <SectionLabel>Angle ({angle}deg)</SectionLabel>
        <input
          type="range"
          min={0}
          max={360}
          value={angle}
          onChange={e => apply(start, end, Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-secondary/50 accent-[var(--d360-orange)]"
        />
      </div>

      {/* Dark/Light toggle + Reset */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={() => store.toggleTheme()}
          className="flex-1 text-[10px] uppercase tracking-widest py-2 rounded-lg border border-border text-foreground hover:bg-secondary/40 transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Mode: {store.theme === 'dark' ? 'Dark' : 'Light'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest py-2 px-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
    </div>
  )
}

function RGBSliders({ rgb, onChange }: { rgb: RGB; onChange: (v: RGB) => void }) {
  const labels = ['R', 'G', 'B'] as const
  const colors = ['#ef4444', '#22c55e', '#3b82f6']
  return (
    <div className="space-y-1">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[9px] w-3 text-center font-bold" style={{ color: colors[i], fontFamily: 'var(--font-mono)' }}>
            {label}
          </span>
          <input
            type="range"
            min={0}
            max={255}
            value={rgb[i]}
            onChange={e => {
              const next: RGB = [...rgb]
              next[i] = Number(e.target.value)
              onChange(next)
            }}
            className="flex-1 h-1 rounded-full appearance-none bg-secondary/50"
            style={{ accentColor: colors[i] }}
          />
          <span className="text-[9px] w-6 text-right text-muted-foreground tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
            {rgb[i]}
          </span>
        </div>
      ))}
    </div>
  )
}
