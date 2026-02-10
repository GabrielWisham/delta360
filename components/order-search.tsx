'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/groupme-api'
import { formatTimestamp, getFullDate } from '@/lib/date-helpers'
import { Hash, Search, X, Loader2, ArrowRight, Clock, Users, MessageCircle, Layers, Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { GroupMeMessage } from '@/lib/types'

const DAY_LABELS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
]

type SearchSource = { type: 'group'; id: string; name: string } | { type: 'dm'; id: string; name: string }

export function OrderSearch() {
  const store = useStore()
  const [code, setCode] = useState('')
  const [results, setResults] = useState<(GroupMeMessage & { _groupName?: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, currentName: '' })
  const [searched, setSearched] = useState(false)
  const [daysBack, setDaysBack] = useState(7)
  const [showSources, setShowSources] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDMs, setSelectedDMs] = useState<Set<string>>(new Set())
  const [selectedStreams, setSelectedStreams] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef(false)

  // Initialize: select all groups by default
  const groupsInitialized = useRef(false)
  useEffect(() => {
    if (store.groups.length > 0 && !groupsInitialized.current) {
      setSelectedGroups(new Set(store.groups.map(g => g.id)))
      groupsInitialized.current = true
    }
  }, [store.groups])

  const streamEntries = useMemo(() => Object.entries(store.streams), [store.streams])

  // Build final search sources from selections (streams expand to group IDs)
  const searchSources = useMemo(() => {
    const sources: SearchSource[] = []
    const groupIds = new Set(selectedGroups)
    // Expand streams
    for (const streamName of selectedStreams) {
      const stream = store.streams[streamName]
      if (stream) stream.ids.forEach(id => groupIds.add(id))
    }
    for (const gid of groupIds) {
      const g = store.groups.find(g => g.id === gid)
      if (g) sources.push({ type: 'group', id: g.id, name: g.name })
    }
    for (const uid of selectedDMs) {
      const d = store.dmChats.find(d => d.other_user.id === uid)
      if (d) sources.push({ type: 'dm', id: d.other_user.id, name: d.other_user.name })
    }
    return sources
  }, [selectedGroups, selectedDMs, selectedStreams, store.groups, store.dmChats, store.streams])

  const totalSelected = selectedGroups.size + selectedDMs.size + selectedStreams.size

  useEffect(() => {
    if (store.orderSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setCode('')
      setResults([])
      setSearched(false)
      setLoading(false)
      abortRef.current = true
    }
  }, [store.orderSearchOpen])

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && store.orderSearchOpen) store.setOrderSearchOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [store])

  const deepSearch = useCallback(async (query: string) => {
    if (!query.trim() || searchSources.length === 0) return
    setLoading(true)
    setSearched(true)
    setResults([])
    abortRef.current = false

    const cutoff = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60)
    const q = query.trim()
    const allResults: (GroupMeMessage & { _groupName?: string })[] = []
    const total = searchSources.length
    setProgress({ done: 0, total, currentName: '' })

    for (let si = 0; si < total; si++) {
      if (abortRef.current) break
      const source = searchSources[si]
      setProgress({ done: si, total, currentName: source.name })

      let beforeId: string | undefined
      let reachedCutoff = false
      let pageCount = 0
      const maxPages = Math.ceil((daysBack / 7) * 5)

      while (!reachedCutoff && pageCount < maxPages) {
        if (abortRef.current) break
        pageCount++
        try {
          let msgs: GroupMeMessage[] = []
          if (source.type === 'group') {
            const res = await api.getGroupMessages(source.id, 100, beforeId)
            msgs = res?.messages || []
          } else {
            const res = await api.getDMMessages(source.id, 100, beforeId)
            msgs = res?.direct_messages || []
          }
          if (msgs.length === 0) break

          for (const m of msgs) {
            if (m.created_at < cutoff) { reachedCutoff = true; break }
            if (m.text && m.text.includes(q)) {
              allResults.push({ ...m, _groupName: source.name })
            }
          }

          beforeId = msgs[msgs.length - 1]?.id
        } catch {
          break
        }
      }
    }

    setProgress({ done: total, total, currentName: '' })
    allResults.sort((a, b) => b.created_at - a.created_at)
    setResults(allResults)
    setLoading(false)
  }, [searchSources, daysBack])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) deepSearch(code)
  }

  // Auto-format: strip non-digits for pure numeric codes
  function handleChange(val: string) {
    setCode(val)
    setSearched(false)
  }

  if (!store.orderSearchOpen) return null

  const isValidCode = code.trim().length >= 4

  return (
    <div
      className="fixed inset-0 z-50 flex items-start max-sm:items-stretch justify-center pt-[8vh] max-sm:pt-0"
      onClick={e => { if (e.target === e.currentTarget) store.setOrderSearchOpen(false) }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative w-full max-w-[520px] max-sm:max-w-full mx-4 max-sm:mx-0 rounded-xl max-sm:rounded-none bg-card border border-border shadow-2xl flex flex-col max-h-[80vh] max-sm:max-h-[100dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--d360-gradient)' }}>
            <Hash className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Order Number Search</h2>
            <p className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
              Search across groups, DMs {'&'} streams
            </p>
          </div>
          <button
            onClick={() => store.setOrderSearchOpen(false)}
            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-border flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                ref={inputRef}
                value={code}
                onChange={e => handleChange(e.target.value)}
                placeholder="Enter order # (e.g. 384572)"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[var(--d360-orange)] tabular-nums"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
                autoComplete="off"
                inputMode="text"
              />
            </div>
            <button
              type="submit"
              disabled={!isValidCode || loading || searchSources.length === 0}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-30 hover:brightness-110 transition-all shrink-0"
              style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Range + source controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-3 h-3 text-muted-foreground/50" />
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              {DAY_LABELS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDaysBack(d.value)}
                  className={`px-2.5 py-1 text-[10px] transition-colors ${
                    daysBack === d.value
                      ? 'bg-[var(--d360-orange)]/15 text-[var(--d360-orange)] font-semibold'
                      : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                showSources ? 'border-[var(--d360-orange)]/40 text-[var(--d360-orange)] bg-[var(--d360-orange)]/10' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <Users className="w-3 h-3" />
              {totalSelected} source{totalSelected !== 1 ? 's' : ''}
              {showSources ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          </div>
        </form>

        {/* Source selection panel */}
        {showSources && (
          <div className="border-b border-border max-h-[200px] overflow-y-auto">
            {/* Quick actions */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-secondary/10 border-b border-border/50">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroups(new Set(store.groups.map(g => g.id)))
                  setSelectedDMs(new Set(store.dmChats.map(d => d.other_user.id)))
                  setSelectedStreams(new Set(streamEntries.map(([n]) => n)))
                }}
                className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-[var(--d360-orange)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Select all
              </button>
              <span className="text-muted-foreground/30 text-[9px]">|</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedGroups(new Set())
                  setSelectedDMs(new Set())
                  setSelectedStreams(new Set())
                }}
                className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Clear all
              </button>
            </div>

            {/* Streams */}
            {streamEntries.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-1.5 bg-secondary/5" style={{ fontFamily: 'var(--font-mono)' }}>
                  <Layers className="w-3 h-3" />
                  Streams
                </div>
                {streamEntries.map(([name, stream]) => {
                  const isSelected = selectedStreams.has(name)
                  const displayName = store.streamRenames?.[name] || name
                  return (
                    <label
                      key={`s-${name}`}
                      className={`flex items-center gap-2.5 text-xs cursor-pointer px-4 py-1.5 transition-colors ${
                        isSelected ? 'bg-[var(--d360-orange)]/8' : 'hover:bg-secondary/30'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-[var(--d360-orange)] border-[var(--d360-orange)]' : 'border-border bg-secondary/30'
                      }`}>
                        {isSelected && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <span className="text-foreground truncate flex-1" style={{ fontFamily: 'var(--font-mono)' }}>{displayName}</span>
                      <span className="text-[9px] text-muted-foreground/50 shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>{stream.ids.length}g</span>
                      <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => {
                        setSelectedStreams(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
                      }} />
                    </label>
                  )
                })}
              </>
            )}

            {/* DMs */}
            {store.dmChats.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-1.5 bg-secondary/5" style={{ fontFamily: 'var(--font-mono)' }}>
                  <MessageCircle className="w-3 h-3" />
                  DMs
                </div>
                {store.dmChats.map(d => {
                  const isSelected = selectedDMs.has(d.other_user.id)
                  return (
                    <label
                      key={`d-${d.other_user.id}`}
                      className={`flex items-center gap-2.5 text-xs cursor-pointer px-4 py-1.5 transition-colors ${
                        isSelected ? 'bg-[var(--d360-orange)]/8' : 'hover:bg-secondary/30'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-[var(--d360-orange)] border-[var(--d360-orange)]' : 'border-border bg-secondary/30'
                      }`}>
                        {isSelected && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <span className="text-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>{d.other_user.name}</span>
                      <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => {
                        setSelectedDMs(prev => { const n = new Set(prev); n.has(d.other_user.id) ? n.delete(d.other_user.id) : n.add(d.other_user.id); return n })
                      }} />
                    </label>
                  )
                })}
              </>
            )}

            {/* Groups */}
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-1.5 bg-secondary/5" style={{ fontFamily: 'var(--font-mono)' }}>
              <Users className="w-3 h-3" />
              Groups
            </div>
            {store.groups.map(g => {
              const isSelected = selectedGroups.has(g.id)
              return (
                <label
                  key={`g-${g.id}`}
                  className={`flex items-center gap-2.5 text-xs cursor-pointer px-4 py-1.5 transition-colors ${
                    isSelected ? 'bg-[var(--d360-orange)]/8' : 'hover:bg-secondary/30'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-[var(--d360-orange)] border-[var(--d360-orange)]' : 'border-border bg-secondary/30'
                  }`}>
                    {isSelected && <Check className="w-2 h-2 text-white" />}
                  </div>
                  <span className="text-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>{g.name}</span>
                  <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => {
                    setSelectedGroups(prev => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })
                  }} />
                </label>
              )
            })}
          </div>
        )}

        {/* Progress bar */}
        {loading && (
          <div className="px-4 py-2 border-b border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                Scanning {progress.currentName || '...'}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="h-1 bg-secondary/30 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '0%',
                  background: 'var(--d360-gradient)',
                }}
              />
            </div>
            {results.length > 0 && (
              <span className="text-[10px] text-[var(--d360-orange)] mt-1 block" style={{ fontFamily: 'var(--font-mono)' }}>
                {results.length} match{results.length !== 1 ? 'es' : ''} found so far
              </span>
            )}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* Empty state */}
          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Hash className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-xs text-muted-foreground mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Enter an order number or code
              </p>
              <p className="text-[10px] text-muted-foreground/50" style={{ fontFamily: 'var(--font-mono)' }}>
                Searches {searchSources.length} source{searchSources.length !== 1 ? 's' : ''} going back {daysBack} days
              </p>
            </div>
          )}

          {/* No results */}
          {searched && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                No messages containing &ldquo;{code}&rdquo; found in the last {daysBack} days
              </p>
              <button
                onClick={() => { setDaysBack(Math.min(daysBack + 7, 30)); }}
                className="mt-3 text-[10px] text-[var(--d360-orange)] hover:underline"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Try extending the search range
              </button>
            </div>
          )}

          {/* Result list */}
          {results.length > 0 && (
            <div className="divide-y divide-border/30">
              {results.map((msg, i) => (
                <button
                  key={`${msg.id}-${i}`}
                  onClick={() => {
                    if (msg.group_id) store.switchView('group', msg.group_id)
                    store.setOrderSearchOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold text-foreground"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {msg.name}
                    </span>
                    {msg._groupName && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground truncate max-w-[120px]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {msg._groupName}
                      </span>
                    )}
                    <span className="flex-1" />
                    <span
                      className="text-[9px] text-muted-foreground tabular-nums shrink-0"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      title={getFullDate(msg.created_at)}
                    >
                      {formatTimestamp(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {highlightCode(msg.text || '', code.trim())}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-2.5 h-2.5" />
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Jump to group</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Result count footer */}
          {searched && !loading && results.length > 0 && (
            <div className="px-4 py-2 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                {results.length} result{results.length !== 1 ? 's' : ''} across {new Set(results.map(r => r.group_id)).size} group{new Set(results.map(r => r.group_id)).size !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function highlightCode(text: string, code: string) {
  if (!code) return text
  const parts: (string | React.ReactElement)[] = []
  let remaining = text
  let idx = remaining.indexOf(code)
  let key = 0

  while (idx !== -1) {
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(
      <span key={key++} className="text-[var(--d360-orange)] font-bold bg-[var(--d360-orange)]/10 px-0.5 rounded">
        {remaining.slice(idx, idx + code.length)}
      </span>
    )
    remaining = remaining.slice(idx + code.length)
    idx = remaining.indexOf(code)
  }
  if (remaining) parts.push(remaining)
  return <>{parts}</>
}
