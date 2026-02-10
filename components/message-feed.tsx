'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { getDayLabel, getFullDate } from '@/lib/date-helpers'
import { MessageCard } from './message-card'
import { EMOJIS } from '@/lib/types'
import { ArrowDown, ArrowUp, History, Loader2, FileText, Paperclip, Send, SmilePlus, AlertTriangle, X } from 'lucide-react'
import type { GroupMeMessage } from '@/lib/types'

export function MessageFeed({ panelIdx }: { panelIdx: number }) {
  const store = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const [dayCue, setDayCue] = useState<string | null>(null)
  const userScrolledRef = useRef(false)
  const prevMsgCountRef = useRef(0)
  const [mainInput, setMainInput] = useState('')
  const [mainEmojiOpen, setMainEmojiOpen] = useState(false)
  const [showChatAlerts, setShowChatAlerts] = useState(false)
  const [newChatAlert, setNewChatAlert] = useState('')
  const mainEmojiRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const view = panelIdx === 0 ? store.currentView : store.panels[panelIdx]
  const messages = store.panelMessages[panelIdx] || []
  const title = view ? store.getPanelTitle(view.type, view.id) : '--'
  const showGroupTag = view?.type === 'all' || view?.type === 'dms' || view?.type === 'stream' || view?.type === 'unified_streams'

  // Keep ref to loadMessages so polling always calls the latest version
  const loadMsgRef = useRef(store.loadMessages)
  loadMsgRef.current = store.loadMessages

  // Load messages on view change (skip unified_streams - store's buffered effect handles it)
  useEffect(() => {
    if (view && view.type !== 'unified_streams') loadMsgRef.current(panelIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.id, panelIdx])

  // Polling (unified_streams is excluded - its own effect handles loading)
  useEffect(() => {
    if (!view || view.type === 'unified_streams') return
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      loadMsgRef.current(panelIdx)
    }, 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.id, panelIdx])

  // Mark seen on load
  useEffect(() => {
    if (view?.id) store.markSeen(view.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.id])

  // Check if scrolled to the "latest" edge (bottom if oldestFirst, top if newestFirst)
  function isAtLatestEdge(el: HTMLDivElement, threshold = 80) {
    if (store.oldestFirst) {
      return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    } else {
      return el.scrollTop < threshold
    }
  }

  // Scroll tracking
  function handleScroll() {
    if (!scrollRef.current) return
    const el = scrollRef.current

    // Detect manual scroll away from latest edge -> disable auto-scroll
    if (!isAtLatestEdge(el)) {
      if (!userScrolledRef.current) {
        userScrolledRef.current = true
        if (store.autoScroll) store.setAutoScroll(false)
      }
      setShowJumpToLatest(true)
    } else {
      userScrolledRef.current = false
      setShowJumpToLatest(false)
    }

    // Day cue
    const dividers = el.querySelectorAll('[data-day-label]')
    let currentDay: string | null = null
    dividers.forEach(d => {
      const div = d as HTMLElement
      if (div.offsetTop < el.scrollTop + 60) {
        currentDay = div.dataset.dayLabel || null
      }
    })
    setDayCue(currentDay)
  }

  // Jump to latest message
  function jumpToLatest() {
    if (!scrollRef.current) return
    if (store.oldestFirst) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    } else {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    userScrolledRef.current = false
    setShowJumpToLatest(false)
  }

  // Order messages
  const ordered = useMemo(() => {
    const sorted = [...messages].sort((a, b) => a.created_at - b.created_at)
    return store.oldestFirst ? sorted : [...sorted].reverse()
  }, [messages, store.oldestFirst])

  // Pinned messages zone
  const pinned = useMemo(() => {
    return ordered.filter(m => store.pinnedMessages[m.id])
  }, [ordered, store.pinnedMessages])

  const unpinned = useMemo(() => {
    return ordered.filter(m => !store.pinnedMessages[m.id])
  }, [ordered, store.pinnedMessages])

  // Auto-scroll on view change (always) and on new messages (when autoScroll is on)
  useEffect(() => {
    if (!scrollRef.current) return
    userScrolledRef.current = false
    setShowJumpToLatest(false)
    if (store.oldestFirst) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    } else {
      scrollRef.current.scrollTop = 0
    }
  }, [view?.type, view?.id, store.oldestFirst])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!scrollRef.current || !store.autoScroll) return
    const newCount = messages.length
    if (newCount > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      // New messages arrived -- scroll to latest
      if (store.oldestFirst) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      } else {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    prevMsgCountRef.current = newCount
  }, [messages.length, store.autoScroll, store.oldestFirst])

  // For unified_streams, also scroll to top when messages finish loading (buffer complete)
  const prevUnifiedLoading = useRef(store.unifiedLoading)
  useEffect(() => {
    if (view?.type === 'unified_streams' && prevUnifiedLoading.current && !store.unifiedLoading && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    prevUnifiedLoading.current = store.unifiedLoading
  }, [store.unifiedLoading, view?.type])

  const scrollToMsg = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-[var(--d360-orange)]')
      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--d360-orange)]'), 2000)
    }
  }, [])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  // Current chat's alert words
  const chatId = view?.id || ''
  const currentChatAlerts = store.chatAlertWords[chatId] || []

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

  // Compute adaptive text color from board gradient
  const boardTextColor = useMemo(() => {
    if (!store.boardGradient) return undefined
    const { start, end } = store.boardGradient
    // Average the gradient midpoint
    const avg = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ]
    // Relative luminance
    const lum = (0.299 * avg[0] + 0.587 * avg[1] + 0.114 * avg[2]) / 255
    return lum > 0.5 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)'
  }, [store.boardGradient])

  const boardMutedColor = useMemo(() => {
    if (!store.boardGradient) return undefined
    const { start, end } = store.boardGradient
    const avg = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ]
    const lum = (0.299 * avg[0] + 0.587 * avg[1] + 0.114 * avg[2]) / 255
    return lum > 0.5 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'
  }, [store.boardGradient])

  const [noMoreMessages, setNoMoreMessages] = useState(false)

  // Reset noMore when view changes
  useEffect(() => { setNoMoreMessages(false) }, [view?.type, view?.id])

  // DM recipient name for watermark
  const dmRecipientName = useMemo(() => {
    if (view?.type !== 'dm' || !view.id) return null
    const chat = store.dmChats.find(d => d.other_user?.id === view.id)
    return chat?.other_user?.name || null
  }, [view?.type, view?.id, store.dmChats])

  const isSpecificView = view?.type === 'group' || view?.type === 'dm' || view?.type === 'stream'

  const inputSection = (
    <div className={`${store.compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-b border-border bg-card relative z-10`}>
      {/* Per-chat alert words panel */}
      {showChatAlerts && isSpecificView && chatId && (
        <div className="mb-2 p-2.5 rounded-lg border border-border bg-secondary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1" style={{ fontFamily: 'var(--font-mono)' }}>
              <AlertTriangle className="w-3 h-3 text-destructive" />
              Chat Priority Words
            </span>
            <button onClick={() => setShowChatAlerts(false)} className="p-0.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          {currentChatAlerts.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {currentChatAlerts.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-destructive/40 text-destructive bg-destructive/5" style={{ fontFamily: 'var(--font-mono)' }}>
                  {w}
                  <button onClick={() => store.setChatAlertWords(chatId, currentChatAlerts.filter((_, j) => j !== i))} className="hover:text-destructive/80">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              value={newChatAlert}
              onChange={e => setNewChatAlert(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newChatAlert.trim()) {
                  store.setChatAlertWords(chatId, [...currentChatAlerts, newChatAlert.trim().toLowerCase()])
                  setNewChatAlert('')
                }
              }}
              placeholder="Add alert word..."
              className="flex-1 text-[10px] bg-secondary/30 border border-border rounded-lg px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-destructive/50"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <button
              onClick={() => {
                if (newChatAlert.trim()) {
                  store.setChatAlertWords(chatId, [...currentChatAlerts, newChatAlert.trim().toLowerCase()])
                  setNewChatAlert('')
                }
              }}
              disabled={!newChatAlert.trim()}
              className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg bg-destructive text-destructive-foreground hover:brightness-110 disabled:opacity-30 transition-all"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Pending image preview */}
      {store.pendingImage && (
        <div className="flex items-center gap-2 mb-2">
          <img src={store.pendingImage} alt="Pending" className="w-12 h-12 rounded-lg object-cover border border-border" />
          <button
            onClick={() => store.setPendingImage(null)}
            className="text-[10px] text-destructive hover:underline"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Remove
          </button>
        </div>
      )}

      {/* Template chips */}
      {isSpecificView && store.templates.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {store.templates.map((tpl, i) => (
            <button
              key={i}
              onClick={() => { setMainInput(prev => prev ? `${prev} ${tpl}` : tpl); autoResize() }}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-[var(--d360-orange)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {tpl}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1.5">
        {/* Attachment */}
        <label className="cursor-pointer p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors">
          <Paperclip className="w-4 h-4" />
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>

        {/* Templates shortcut */}
        {isSpecificView && (
          <button
            onClick={() => store.setConfigOpen(true, 'templates')}
            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            title="Quick templates"
          >
            <FileText className="w-4 h-4" />
          </button>
        )}

        {/* Per-chat alerts */}
        {isSpecificView && chatId && (
          <button
            onClick={() => setShowChatAlerts(!showChatAlerts)}
            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              showChatAlerts || currentChatAlerts.length > 0
                ? 'text-destructive bg-destructive/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title={`Chat alert words (${currentChatAlerts.length})`}
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        )}

        {/* Auto-expanding textarea */}
        <textarea
          ref={textareaRef}
          value={mainInput}
          onChange={e => { setMainInput(e.target.value); autoResize() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); if (textareaRef.current) { textareaRef.current.style.height = 'auto' } }
          }}
          placeholder={isSpecificView ? `Message ${dmRecipientName || title}...` : 'Select a chat to send messages'}
          disabled={!isSpecificView}
          className="flex-1 text-sm bg-secondary/30 border border-border rounded-lg px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)] disabled:opacity-50 transition-all"
          style={{ fontFamily: 'var(--font-mono)', maxHeight: '160px', overflow: 'auto' }}
          rows={1}
        />

        {/* Emoji */}
        <div className="relative" ref={mainEmojiRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMainEmojiOpen(prev => !prev) }}
            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <SmilePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Send */}
        <button
          onClick={() => { handleSend(); if (textareaRef.current) textareaRef.current.style.height = 'auto' }}
          disabled={!mainInput.trim() || !isSpecificView}
          className="p-2 rounded-lg disabled:opacity-30 transition-all hover:brightness-110 shrink-0 text-white"
          style={{ background: 'var(--d360-gradient)' }}
          title="Send (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji picker overlay */}
      {mainEmojiOpen && (
        <div className="absolute bottom-full right-3 mb-2 rounded-xl p-3 grid grid-cols-6 gap-1.5 z-50 shadow-xl bg-card border border-border">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => {
                setMainInput(prev => prev + e)
                setMainEmojiOpen(false)
                autoResize()
              }}
              className="text-base hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"
            >
              {e}
            </button>
          ))}
        </div>
      )}
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
        className={`flex-1 overflow-y-auto px-3 py-2 flex flex-col min-h-0 ${store.compact ? 'gap-0.5' : 'gap-1.5'}`}
        style={store.boardGradient ? {
          background: `linear-gradient(${store.boardGradient.angle}deg, rgb(${store.boardGradient.start.join(',')}), rgb(${store.boardGradient.end.join(',')}))`,
          ['--board-text' as string]: boardTextColor,
          ['--board-muted' as string]: boardMutedColor,
          color: boardTextColor,
        } : undefined}
      >
        {/* DM recipient watermark */}
        {dmRecipientName && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0">
            <span
              className="text-[60px] font-black uppercase tracking-widest opacity-[0.03] select-none whitespace-nowrap"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {dmRecipientName}
            </span>
          </div>
        )}

        {/* Unified streams loading gate: show ONLY spinner while syncing */}
        {store.unifiedLoading && view?.type === 'unified_streams' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-border" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[var(--d360-orange)] animate-spin" />
            </div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Syncing streams</p>
          </div>
        ) : (
          <>
            {/* Load earlier messages (at top when oldest-first, since oldest is at top) */}
            {store.oldestFirst && (view?.type === 'group' || view?.type === 'dm') && messages.length >= 5 && !noMoreMessages && (
              <div className="flex justify-center py-2">
                <button
                  onClick={async () => {
                    const loaded = await store.loadMoreMessages(panelIdx)
                    if (loaded === 0) setNoMoreMessages(true)
                  }}
                  disabled={store.loadingMore}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-[var(--d360-orange)] transition-colors disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {store.loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                  {store.loadingMore ? 'Loading...' : 'Load Earlier Messages'}
                </button>
              </div>
            )}
            {store.oldestFirst && noMoreMessages && (
              <div className="text-center text-[9px] text-muted-foreground/50 py-1 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
                Beginning of conversation
              </div>
            )}

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

            {/* Load earlier messages (at bottom when newest-first, since oldest is at bottom) */}
            {!store.oldestFirst && (view?.type === 'group' || view?.type === 'dm') && messages.length >= 5 && !noMoreMessages && (
              <div className="flex justify-center py-2">
                <button
                  onClick={async () => {
                    const loaded = await store.loadMoreMessages(panelIdx)
                    if (loaded === 0) setNoMoreMessages(true)
                  }}
                  disabled={store.loadingMore}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-[var(--d360-orange)] transition-colors disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {store.loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                  {store.loadingMore ? 'Loading...' : 'Load Earlier Messages'}
                </button>
              </div>
            )}
            {!store.oldestFirst && noMoreMessages && (
              <div className="text-center text-[9px] text-muted-foreground/50 py-1 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
                Beginning of conversation
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                  {view?.type === 'unified_streams' ? 'Toggle streams to see messages' : view ? 'Loading messages...' : 'Select a chat'}
                </p>
              </div>
            )}
          </>
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

      {/* Jump to latest button */}
      {showJumpToLatest && (
        <button
          onClick={jumpToLatest}
          className="absolute bottom-16 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10px] uppercase tracking-widest font-semibold shadow-lg hover:brightness-110 transition-all z-10"
          style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
        >
          {store.oldestFirst ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
          Latest
        </button>
      )}
    </div>
  )
}
