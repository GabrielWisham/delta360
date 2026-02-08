'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { getDayLabel, getFullDate } from '@/lib/date-helpers'
import { MessageCard } from './message-card'
import { EMOJIS } from '@/lib/types'
import type { GroupMeMessage } from '@/lib/types'

export function MessageFeed({ panelIdx }: { panelIdx: number }) {
  const store = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [dayCue, setDayCue] = useState<string | null>(null)
  const [mainInput, setMainInput] = useState('')
  const [mainEmojiOpen, setMainEmojiOpen] = useState(false)
  const mainEmojiRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const view = panelIdx === 0 ? store.currentView : store.panels[panelIdx]
  const messages = store.panelMessages[panelIdx] || []
  const title = view ? store.getPanelTitle(view.type, view.id) : '--'
  const showGroupTag = view?.type === 'all' || view?.type === 'dms' || view?.type === 'stream' || view?.type === 'unified_streams'

  // Keep a ref to loadMessages so polling always calls the latest version
  const loadMsgRef = useRef(store.loadMessages)
  loadMsgRef.current = store.loadMessages

  // Load messages on view change
  useEffect(() => {
    if (view) loadMsgRef.current(panelIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.id, panelIdx])

  // Polling - uses ref so it always calls the latest loadMessages
  useEffect(() => {
    if (!view) return
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      loadMsgRef.current(panelIdx)
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.id, panelIdx])

  // Mark seen on load
  useEffect(() => {
    if (view?.id) store.markSeen(view.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.id])

  // Scroll tracking
  function handleScroll() {
    if (!scrollRef.current) return
    const st = scrollRef.current.scrollTop
    setShowScrollTop(st > 150)

    // Day cue
    const dividers = scrollRef.current.querySelectorAll('[data-day-label]')
    let currentDay: string | null = null
    dividers.forEach(d => {
      const el = d as HTMLElement
      if (el.offsetTop < st + 60) {
        currentDay = el.dataset.dayLabel || null
      }
    })
    setDayCue(currentDay)
  }

  // Order messages
  const ordered = useMemo(() => {
    const sorted = [...messages].sort((a, b) => a.created_at - b.created_at)
    return store.oldestFirst ? sorted : sorted.reverse()
  }, [messages, store.oldestFirst])

  // Pinned messages zone
  const pinned = useMemo(() => {
    return ordered.filter(m => store.pinnedMessages[m.id])
  }, [ordered, store.pinnedMessages])

  const unpinned = useMemo(() => {
    return ordered.filter(m => !store.pinnedMessages[m.id])
  }, [ordered, store.pinnedMessages])

  // Auto-scroll based on sort order
  useEffect(() => {
    if (!scrollRef.current) return
    if (store.oldestFirst) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    } else {
      scrollRef.current.scrollTop = 0
    }
  }, [view?.type, view?.id, store.oldestFirst])

  const scrollToMsg = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-[var(--d360-orange)]')
      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--d360-orange)]'), 2000)
    }
  }, [])

  async function handleSend() {
    if (!mainInput.trim()) return
    const attachments: GroupMeMessage['attachments'] = []
    if (store.pendingImage) {
      attachments.push({ type: 'image', url: store.pendingImage })
    }
    await store.sendMessage(panelIdx, mainInput.trim(), attachments)
    setMainInput('')
    store.setPendingImage(null)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) store.uploadImage(file)
    e.target.value = ''
  }

  // Close emoji on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mainEmojiRef.current && !mainEmojiRef.current.contains(e.target as Node)) {
        setMainEmojiOpen(false)
      }
    }
    if (mainEmojiOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mainEmojiOpen])

  // Build day divider groups
  const msgsWithDividers = useMemo(() => {
    const items: ({ type: 'divider'; label: string; fullDate: string; ts: number } | { type: 'msg'; msg: GroupMeMessage })[] = []
    let lastDay = ''
    unpinned.forEach(m => {
      const day = getDayLabel(m.created_at)
      if (day !== lastDay) {
        lastDay = day
        items.push({ type: 'divider', label: day, fullDate: getFullDate(m.created_at), ts: m.created_at })
      }
      items.push({ type: 'msg', msg: m })
    })
    return items
  }, [unpinned])

  const isSpecificView = view?.type === 'group' || view?.type === 'dm' || view?.type === 'stream'

  const inputSection = (
    <div className={`${store.compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-b border-border`}>
      {/* Template bar */}
      {isSpecificView && store.templates.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {store.templates.map((tpl, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <button
                onClick={() => setMainInput(prev => prev ? `${prev} ${tpl}` : tpl)}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-[var(--d360-orange)] transition-colors"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {tpl}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(tpl)}
                className="text-[9px] text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                {'\u{1F4C4}'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending image preview */}
      {store.pendingImage && (
        <div className="flex items-center gap-2 mb-2">
          <img src={store.pendingImage} alt="Pending" className="w-12 h-12 rounded object-cover" />
          <button
            onClick={() => store.setPendingImage(null)}
            className="text-[10px] text-[var(--d360-red)] hover:underline"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            Remove
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <label className="cursor-pointer p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground shrink-0">
          <span>{'\u{1F4CE}'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>

        <textarea
          value={mainInput}
          onChange={e => setMainInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder={isSpecificView ? `Message ${title}...` : 'Select a chat to send messages'}
          disabled={!isSpecificView}
          className="flex-1 text-sm bg-secondary/40 border border-border rounded-lg px-3 py-2 resize-none max-h-[100px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)] disabled:opacity-50"
          rows={1}
        />

        <div className="relative" ref={mainEmojiRef}>
          <button
            onClick={() => setMainEmojiOpen(!mainEmojiOpen)}
            className="text-lg hover:scale-110 transition-transform shrink-0"
          >
            {'\u{1F600}'}
          </button>
          {mainEmojiOpen && (
            <div className="glass absolute bottom-full right-0 mb-1 rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-lg">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => {
                    setMainInput(prev => prev + e)
                    setMainEmojiOpen(false)
                  }}
                  className="text-sm hover:scale-125 transition-transform w-7 h-7 flex items-center justify-center rounded hover:bg-secondary/60"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!mainInput.trim() || !isSpecificView}
          className="text-sm font-bold text-white px-3 py-2 rounded-lg disabled:opacity-30 transition-all hover:brightness-110 shrink-0"
          style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-jetbrains)' }}
        >
          {'\u2191'} Send
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* Panel header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 border-b border-border cursor-pointer ${
          panelIdx === store.activePanelIdx
            ? 'border-b-2 border-b-[var(--d360-yellow)]'
            : ''
        }`}
        style={panelIdx === store.activePanelIdx ? { background: 'rgba(255,204,0,0.08)' } : {}}
        onClick={() => store.setActivePanel(panelIdx)}
      >
        <span
          className="text-xs uppercase tracking-widest font-semibold text-foreground truncate flex-1"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          {title}
        </span>
        {panelIdx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); store.closePanel(panelIdx) }}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {'\u2715'}
          </button>
        )}
      </div>

      {/* Input (top or bottom) */}
      {!store.inputBottom && inputSection}

      {/* Message scroll area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2 min-h-0"
      >
        {/* Pinned zone */}
        {pinned.length > 0 && (
          <div className="mb-2">
            <div
              className="text-[9px] uppercase tracking-widest text-[var(--d360-yellow)] mb-1 px-1"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              {'\u{1F4CC}'} Pinned
            </div>
            <div className="flex flex-col gap-1.5">
              {pinned.map(m => (
                <MessageCard key={m.id} msg={m} panelIdx={panelIdx} showGroupTag={showGroupTag} onScrollToMsg={scrollToMsg} />
              ))}
            </div>
          </div>
        )}

        {/* Messages with day dividers */}
        {msgsWithDividers.map((item, i) => {
          if (item.type === 'divider') {
            return (
              <div
                key={`div-${item.ts}`}
                data-day-label={item.label}
                className="flex items-center gap-3 py-2 group"
              >
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border), transparent)' }} />
                <span
                  className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-help relative"
                  style={{ fontFamily: 'var(--font-jetbrains)' }}
                  title={item.fullDate}
                >
                  {item.label}
                  <span className="glass hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] px-2 py-1 rounded z-10">
                    {item.fullDate}
                  </span>
                </span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border), transparent)' }} />
              </div>
            )
          }
          return (
            <MessageCard
              key={item.msg.id}
              msg={item.msg}
              panelIdx={panelIdx}
              showGroupTag={showGroupTag}
              onScrollToMsg={scrollToMsg}
            />
          )
        })}

        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
              {view ? 'Loading messages...' : 'Select a chat'}
            </p>
          </div>
        )}
      </div>

      {/* Input (bottom) */}
      {store.inputBottom && inputSection}

      {/* Day cue badge */}
      {dayCue && (
        <div
          className="glass absolute top-12 right-3 text-[9px] uppercase tracking-widest px-2 py-1 rounded z-10 text-muted-foreground"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          {dayCue}
        </div>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="absolute bottom-16 right-3 w-8 h-8 rounded-full text-white text-sm flex items-center justify-center shadow-lg hover:brightness-110 transition-all z-10"
          style={{ background: 'var(--d360-gradient)' }}
        >
          {'\u2191'}
        </button>
      )}
    </div>
  )
}
