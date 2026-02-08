'use client'

import { useState, useRef, useEffect } from 'react'
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
} from 'lucide-react'

type Tab = 'streams' | 'templates' | 'alerts' | 'audio'

const TABS: { key: Tab; label: string; Icon: typeof Radio }[] = [
  { key: 'streams', label: 'Streams', Icon: Radio },
  { key: 'templates', label: 'Templates', Icon: MessageSquareText },
  { key: 'alerts', label: 'Alerts', Icon: Bell },
  { key: 'audio', label: 'Audio', Icon: Volume2 },
]

export function ConfigPanel() {
  const store = useStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>('streams')

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
  }, [store.editingStream, store])

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

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
        className="relative w-full max-w-[560px] max-h-[80vh] mx-4 rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
        <div className="flex-1 overflow-y-auto px-5 py-4" role="tabpanel">
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
          {activeTab === 'audio' && (
            <AudioTab store={store} />
          )}
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
  return (
    <div className="space-y-4">
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
      <div className="max-h-[180px] overflow-y-auto rounded-lg border border-border bg-secondary/20 divide-y divide-border/50">
        {groups.map(g => {
          const checked = selectedGroups.has(g.id)
          return (
            <label
              key={g.id}
              className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors ${
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
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleGroup(g.id)}
                className="sr-only"
              />
              <span className="truncate text-foreground">{g.name}</span>
            </label>
          )
        })}
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
            <div key={i} className="flex items-center gap-2 px-3 py-2 group">
              <span className="flex-1 text-xs text-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>{t}</span>
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

      <div className="flex gap-2">
        <input
          value={newTemplate}
          onChange={e => setNewTemplate(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTemplate()}
          placeholder="Type a template message..."
          className="flex-1 text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        <button
          onClick={addTemplate}
          disabled={!newTemplate.trim()}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest px-3 py-2 rounded-lg bg-[var(--d360-orange)] text-white hover:brightness-110 disabled:opacity-30 transition-all"
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
