'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { playSound } from '@/lib/sounds'
import { SOUND_NAMES } from '@/lib/types'
import type { SoundName } from '@/lib/types'

function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function ConfigPanel() {
  const store = useStore()
  const panelRef = useRef<HTMLDivElement>(null)

  // Stream builder state (prefill from editingStream)
  const [streamName, setStreamName] = useState('')
  const [streamSound, setStreamSound] = useState<SoundName>('radar')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [isEditing, setIsEditing] = useState(false)

  // Track if we just prefilled from an edit to avoid the reset overwriting it
  const justEdited = useRef(false)

  // Prefill when editing an existing stream
  useEffect(() => {
    if (store.editingStream) {
      setStreamName(store.editingStream.name)
      setStreamSound(store.editingStream.sound)
      setSelectedGroups(new Set(store.editingStream.ids))
      setIsEditing(true)
      justEdited.current = true
      store.setEditingStream(null) // clear so it doesn't re-trigger
    }
  }, [store.editingStream, store])

  // Reset fields when config panel is opened fresh (not from edit)
  const wasOpen = useRef(store.configOpen)
  useEffect(() => {
    if (store.configOpen && !wasOpen.current) {
      if (justEdited.current) {
        // Skip reset - this open was from the edit action
        justEdited.current = false
      } else {
        setStreamName('')
        setStreamSound('radar')
        setSelectedGroups(new Set())
        setIsEditing(false)
      }
    }
    wasOpen.current = store.configOpen
  }, [store.configOpen])

  // Template state
  const [newTemplate, setNewTemplate] = useState('')

  // Alert word state
  const [newAlert, setNewAlert] = useState('')

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const sidebar = document.querySelector('aside')
        if (sidebar?.contains(e.target as Node)) return
        store.setConfigOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [store])

  if (!store.configOpen) return null

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
    <div
      ref={panelRef}
      className="glass border-b-2 border-b-[var(--d360-orange)] overflow-y-auto max-h-[60vh] px-4 py-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x divide-border">
        {/* Column 1: Stream Builder */}
        <div className="space-y-3 md:pr-4">
          <h3
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Stream Builder
          </h3>

          <input
            value={streamName}
            onChange={e => setStreamName(e.target.value)}
            placeholder="Stream name"
            className="w-full text-sm bg-secondary/40 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          />

          {/* Sound picker */}
          <div className="flex flex-wrap gap-1">
            {SOUND_NAMES.map(s => (
              <div key={s} className="flex items-center gap-0.5">
                <button
                  onClick={() => setStreamSound(s)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    streamSound === s
                      ? 'border-[var(--d360-orange)] text-[var(--d360-orange)]'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  {s}
                </button>
                <button
                  onClick={() => playSound(s)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Preview"
                >
                  <PlayIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Group checklist */}
          <div className="max-h-[150px] overflow-y-auto space-y-1">
            {store.groups.map(g => (
              <label
                key={g.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/40 rounded px-1 py-0.5"
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.has(g.id)}
                  onChange={() => toggleGroup(g.id)}
                  className="accent-[var(--d360-orange)]"
                />
                <span className="truncate text-foreground">{g.name}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleSaveStream}
            disabled={!streamName.trim() || selectedGroups.size === 0}
            className="w-full text-xs font-semibold uppercase tracking-widest text-white py-2 rounded-lg disabled:opacity-30 transition-all hover:brightness-110"
            style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-jetbrains)' }}
          >
            {isEditing ? 'Update Stream' : 'Save Stream'}
          </button>
        </div>

        {/* Column 2: Templates & Alerts */}
        <div className="space-y-3 md:px-4">
          <h3
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Message Templates
          </h3>
          <div className="space-y-1">
            {store.templates.map((t, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <span className="flex-1 text-foreground truncate">{t}</span>
                <button
                  onClick={() => removeTemplate(i)}
                  className="text-muted-foreground hover:text-[var(--d360-red)] text-[10px]"
                >
                  {'\u2715'}
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={newTemplate}
              onChange={e => setNewTemplate(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTemplate()}
              placeholder="Add template..."
              className="flex-1 text-xs bg-secondary/40 border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            />
            <button
              onClick={addTemplate}
              className="text-[10px] text-[var(--d360-orange)] px-2"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              ADD
            </button>
          </div>

          <div className="border-t border-border pt-3">
            <h3
              className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              Priority Alert Words
            </h3>
            <div className="flex flex-wrap gap-1 mb-2">
              {store.alertWords.map((w, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--d360-red)] text-[var(--d360-red)] flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  {w}
                  <button onClick={() => removeAlertWord(i)} className="hover:text-foreground">{'\u2715'}</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={newAlert}
                onChange={e => setNewAlert(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAlertWord()}
                placeholder="Add alert word..."
                className="flex-1 text-xs bg-secondary/40 border border-border rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              />
              <button
                onClick={addAlertWord}
                className="text-[10px] text-[var(--d360-red)] px-2"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                ADD
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Audio Settings */}
        <div className="space-y-3 md:pl-4">
          <h3
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Audio Settings
          </h3>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={store.allNotif}
              onChange={e => store.setAllNotif(e.target.checked)}
              className="accent-[var(--d360-orange)]"
            />
            <span className="text-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              All Notifications
            </span>
          </label>

          {/* Feed sound */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              Feed Sound
            </span>
            <div className="flex items-center gap-2">
              <select
                value={store.feedSound}
                onChange={e => store.setFeedSound(e.target.value as SoundName)}
                className="flex-1 text-xs bg-secondary/40 border border-border rounded px-2 py-1 text-foreground"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {SOUND_NAMES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button onClick={() => playSound(store.feedSound)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Preview"><PlayIcon className="w-3 h-3" /></button>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.feedMuted}
                  onChange={e => store.setFeedMuted(e.target.checked)}
                  className="accent-[var(--d360-orange)]"
                />
                <span className="text-muted-foreground">Mute</span>
              </label>
            </div>
          </div>

          {/* DM sound */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              DM Sound
            </span>
            <div className="flex items-center gap-2">
              <select
                value={store.dmSound}
                onChange={e => store.setDmSound(e.target.value as SoundName)}
                className="flex-1 text-xs bg-secondary/40 border border-border rounded px-2 py-1 text-foreground"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {SOUND_NAMES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button onClick={() => playSound(store.dmSound)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Preview"><PlayIcon className="w-3 h-3" /></button>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={store.dmMuted}
                  onChange={e => store.setDmMuted(e.target.checked)}
                  className="accent-[var(--d360-orange)]"
                />
                <span className="text-muted-foreground">Mute</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
