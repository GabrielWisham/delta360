'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { formatTimestamp } from '@/lib/date-helpers'
import { api } from '@/lib/groupme-api'
import { Search, X } from 'lucide-react'
import type { GroupMeMessage } from '@/lib/types'

export function SearchPanel() {
  const store = useStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GroupMeMessage[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut: "/" to open, Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        store.setSearchOpen(true)
      }
      if (e.key === 'Escape' && store.searchOpen) {
        store.setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [store, store.searchOpen])

  // Auto focus when opened
  useEffect(() => {
    if (store.searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      // Reset state when closed
      setQuery('')
      setResults([])
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
      className="fixed inset-0 z-50 flex items-start max-sm:items-stretch justify-center pt-[10vh] max-sm:pt-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) store.setSearchOpen(false)
      }}
    >
      {/* Opaque backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Search modal */}
      <div className="relative w-full max-w-[540px] max-sm:max-w-full mx-4 max-sm:mx-0 rounded-xl max-sm:rounded-none bg-card border border-border shadow-2xl flex flex-col max-h-[70vh] max-sm:max-h-[100dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            ESC
          </kbd>
          <button
            onClick={() => store.setSearchOpen(false)}
            className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* Empty state */}
          {!query && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                Type to search across all your messages
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                {'Press / anywhere to open search'}
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 px-4 py-6">
              <div className="w-3 h-3 rounded-full border-2 border-[var(--d360-orange)] border-t-transparent animate-spin" />
              <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                Searching...
              </span>
            </div>
          )}

          {/* No results */}
          {!loading && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* Result list */}
          {results.length > 0 && (
            <div className="divide-y divide-border/50">
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
                    className="w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] uppercase tracking-wider text-foreground font-semibold"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {msg.name}
                      </span>
                      {groupName && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {groupName}
                        </span>
                      )}
                      <span className="flex-1" />
                      <span
                        className="text-[9px] text-muted-foreground"
                        style={{ fontFamily: 'var(--font-mono)' }}
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
          )}

          {/* Result count footer */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>
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
