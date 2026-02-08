'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { formatTimestamp } from '@/lib/date-helpers'
import { api } from '@/lib/groupme-api'
import type { GroupMeMessage } from '@/lib/types'

export function SearchPanel() {
  const store = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GroupMeMessage[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        store.setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [store])

  // Auto focus
  useEffect(() => {
    if (store.searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [store.searchOpen])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)

    // Search local cache first
    const localResults = store.searchIndex.filter(m =>
      m.text?.toLowerCase().includes(q.toLowerCase())
    )

    if (localResults.length > 5) {
      setResults(localResults.sort((a, b) => b.created_at - a.created_at).slice(0, 50))
      setLoading(false)
      return
    }

    // API search for more coverage
    const isNumeric = /^\d{4,}$/.test(q.trim())
    const limit = isNumeric ? 40 : 15
    const groupsToSearch = store.groups.slice(0, 12)

    try {
      const fetches = groupsToSearch.map(g =>
        api.getGroupMessages(g.id, limit).catch(() => null)
      )
      const res = await Promise.all(fetches)
      const allMsgs: GroupMeMessage[] = [...localResults]

      res.forEach(r => {
        if (r?.messages) {
          r.messages.forEach(m => {
            if (m.text?.toLowerCase().includes(q.toLowerCase()) && !allMsgs.find(x => x.id === m.id)) {
              allMsgs.push(m)
            }
          })
        }
      })

      setResults(allMsgs.sort((a, b) => b.created_at - a.created_at).slice(0, 50))
    } catch {
      setResults(localResults)
    }
    setLoading(false)
  }, [store.searchIndex, store.groups])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 250)
  }

  if (!store.searchOpen) return null

  return (
    <div
      className="glass absolute inset-0 z-40 flex flex-col overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) store.setSearchOpen(false)
      }}
    >
      <div className="p-3 border-b border-border flex items-center gap-2">
        <span className="text-sm">{'\u{1F50D}'}</span>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        />
        <button
          onClick={() => store.setSearchOpen(false)}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          {'\u2715'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Searching...
          </p>
        )}

        {!loading && query && results.length === 0 && (
          <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            No results found
          </p>
        )}

        {results.map(msg => {
          const groupName = msg.group_id
            ? store.groups.find(g => g.id === msg.group_id)?.name
            : 'DM'

          return (
            <button
              key={msg.id}
              onClick={() => {
                if (msg.group_id) store.switchView('group', msg.group_id)
                store.setSearchOpen(false)
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[10px] uppercase tracking-wider text-foreground font-semibold"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  {msg.name}
                </span>
                {groupName && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground"
                    style={{ fontFamily: 'var(--font-jetbrains)' }}
                  >
                    {groupName}
                  </span>
                )}
                <span className="flex-1" />
                <span
                  className="text-[9px] text-muted-foreground"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                >
                  {formatTimestamp(msg.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {highlightMatch(msg.text || '', query)}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function highlightMatch(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[var(--d360-orange)] font-semibold">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}
