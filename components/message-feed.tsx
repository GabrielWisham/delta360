'use client'

import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { getDayLabel, getFullDate } from '@/lib/date-helpers'
import { MessageCard } from './message-card'
import { EMOJIS } from '@/lib/types'
import { ArrowDown, ArrowUp, History, Loader2, FileText, Paperclip, Send, SmilePlus, AlertTriangle, X, Reply } from 'lucide-react'
import type { GroupMeMessage } from '@/lib/types'

export function MessageFeed({ panelIdx }: { panelIdx: number }) {
  const store = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [dayCue, setDayCue] = useState<string | null>(null)
  const userScrolledRef = useRef(false)
  const justSentRef = useRef(false)
  // Guards against programmatic scrolls being misinterpreted as user scrolls.
  const programmaticScrollRef = useRef(false)
  // Signal that handleSend needs a scroll after the next commit.
  const needsSendScrollRef = useRef(false)
  const prevMsgCountRef = useRef(0)
  const snapshotMsgCountRef = useRef(0) // msg count when user scrolled away
  const [mainInput, setMainInput] = useState('')
  const [mainEmojiOpen, setMainEmojiOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<GroupMeMessage | null>(null)
  const [showChatAlerts, setShowChatAlerts] = useState(false)
  const [newChatAlert, setNewChatAlert] = useState('')
  const mainEmojiRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const view = panelIdx === 0 ? store.currentView : store.panels[panelIdx]
  const messages = store.panelMessages[panelIdx] || []
  const [viewLoaded, setViewLoaded] = useState(false)
  const title = view ? store.getPanelTitle(view.type, view.id) : '--'
  const showGroupTag = view?.type === 'all' || view?.type === 'dms' || view?.type === 'stream' || view?.type === 'unified_streams'

  // Map message ID -> sender name so reply indicators can show who was replied to
  const replyNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of messages) { if (m.id && m.name) map.set(m.id, m.name) }
    return map
  }, [messages])

  // Keep ref to loadMessages so polling always calls the latest version
  const loadMsgRef = useRef(store.loadMessages)
  loadMsgRef.current = store.loadMessages

  // Load messages on view change or when pollLoop detects new messages for this view
  const prevViewRef = useRef<string | null>(null)
  useEffect(() => {
    const viewKey = `${view?.type}:${view?.id}`
    const isViewSwitch = prevViewRef.current !== null && prevViewRef.current !== viewKey
    prevViewRef.current = viewKey
    // If switchView pre-populated from cache, messages are already there
    if (messages.length > 0) setViewLoaded(true)
    if (view && view.type !== 'unified_streams') loadMsgRef.current(panelIdx, false, isViewSwitch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.id, panelIdx, store.feedRefreshTick])

  // Polling (unified_streams is excluded - its own effect handles loading)
  useEffect(() => {
    if (!view || view.type === 'unified_streams') return
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

  // Check if scrolled to the "latest" edge (bottom if oldestFirst, top if newestFirst).
  // Use a generous threshold so smooth-scroll intermediate frames and small
  // layout shifts don't falsely trigger "user scrolled away" detection.
  function isAtLatestEdge(el: HTMLDivElement, threshold = 250) {
    if (store.oldestFirst) {
      return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    } else {
      return el.scrollTop < threshold
    }
  }
  }

  // Scroll tracking -- suppressed during view transitions to prevent glitchy
  // state updates (day cue, jump-to-latest) from stale scroll positions.
  function handleScroll() {
    if (!scrollRef.current || transitioningRef.current) return
    const el = scrollRef.current
    const atEdge = isAtLatestEdge(el)

    // Detect manual scroll away from latest edge.
    // Skip if we just sent a message -- the content reflow triggers a spurious
    // scroll event that would re-set userScrolledRef before auto-scroll fires.
    if (!atEdge && !justSentRef.current && !programmaticScrollRef.current) {
      if (!userScrolledRef.current) {
        userScrolledRef.current = true
        snapshotMsgCountRef.current = messages.length
      }
      setShowJumpToLatest(true)
    } else if (atEdge) {
      userScrolledRef.current = false
      programmaticScrollRef.current = false
      setShowJumpToLatest(false)
      setNewMsgCount(0)
      snapshotMsgCountRef.current = 0
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

  // Track new messages arriving while user is scrolled away
  useEffect(() => {
    if (userScrolledRef.current && snapshotMsgCountRef.current > 0 && messages.length > snapshotMsgCountRef.current) {
      setNewMsgCount(messages.length - snapshotMsgCountRef.current)
    }
  }, [messages.length])

  // Jump to latest message
  function jumpToLatest() {
  if (!scrollRef.current) return
  programmaticScrollRef.current = true
  setTimeout(() => { programmaticScrollRef.current = false }, 500)
  if (store.oldestFirst) {
  scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  } else {
  scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    userScrolledRef.current = false
    setShowJumpToLatest(false)
    setNewMsgCount(0)
    snapshotMsgCountRef.current = 0
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

  // On view change: reset scroll state and suppress scroll side-effects until
  // messages load. The `transitioningRef` guard prevents handleScroll from
  // flashing stale day-cue or "jump to latest" button during the transition.
  const pendingJumpToUnread = useRef(false)
  const transitioningRef = useRef(false)
  useEffect(() => {
    transitioningRef.current = true
    userScrolledRef.current = false
    programmaticScrollRef.current = true
    setTimeout(() => { programmaticScrollRef.current = false }, 500)
    setViewLoaded(false)
    prevMsgCountRef.current = 0
    prevLastMsgIdRef.current = null
    setShowJumpToLatest(false)
    setNewMsgCount(0)
    setDayCue(null)
    snapshotMsgCountRef.current = 0

    const chatId = view?.id
    if (store.jumpToUnread && chatId && store.lastSeen[chatId]) {
      pendingJumpToUnread.current = true
    } else {
      pendingJumpToUnread.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.type, view?.id, store.oldestFirst, store.jumpToUnread])

  const prevLastMsgIdRef = useRef<string | null>(null)

  // Auto-scroll when new messages arrive (including first load)
  // We track BOTH count and the last message ID to catch cases where
  // the array length stays the same but new messages were added (unified feed cap).
  const lastMsgId = messages.length > 0
    ? (store.oldestFirst ? messages[messages.length - 1]?.id : messages[0]?.id)
    : null
  useEffect(() => {
    if (!scrollRef.current) return
    // If a pending scroll target is set (toast click), skip auto-scroll
    if (store.pendingScrollToMsgId) {
      prevMsgCountRef.current = messages.length
      prevLastMsgIdRef.current = lastMsgId
      return
    }
    const newCount = messages.length
    const wasEmpty = prevMsgCountRef.current === 0
    const hasNewMessages = newCount > prevMsgCountRef.current ||
      (newCount > 0 && lastMsgId !== prevLastMsgIdRef.current && prevLastMsgIdRef.current !== null)

    if (hasNewMessages) {
      if (wasEmpty) {
        // First load: mark view as loaded and ensure scroll state is clean
        setViewLoaded(true)
        userScrolledRef.current = false
        programmaticScrollRef.current = true
        setTimeout(() => { programmaticScrollRef.current = false }, 500)
        // First load -- check if we should jump to first unread
        if (pendingJumpToUnread.current) {
          pendingJumpToUnread.current = false
          const chatId = view?.id
          const seenTs = chatId ? (store.lastSeen[chatId] || 0) : 0
          const firstUnreadIdx = messages.findIndex(m => m.created_at > seenTs)
          if (firstUnreadIdx > 0) {
            requestAnimationFrame(() => {
              const container = scrollRef.current
              if (!container) return
              const msgElements = container.querySelectorAll('[data-msg-id]')
              const target = msgElements[firstUnreadIdx]
              if (target) {
                target.scrollIntoView({ block: 'start' })
                container.scrollTop = Math.max(0, container.scrollTop - 40)
              }
              transitioningRef.current = false
            })
          } else {
            requestAnimationFrame(() => {
              const c = scrollRef.current
              if (!c) return
              if (store.oldestFirst) { c.scrollTop = c.scrollHeight } else { c.scrollTop = 0 }
              transitioningRef.current = false
              setTimeout(() => {
                if (!scrollRef.current) return
                if (store.oldestFirst) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight } else { scrollRef.current.scrollTop = 0 }
              }, 100)
            })
          }
        } else {
          // Default: jump to most recent after DOM renders.
          // Double-pass: rAF for initial scroll, then a short delay to catch
          // any layout reflow (e.g., input section resizing the flex container).
          requestAnimationFrame(() => {
            const c = scrollRef.current
            if (!c) return
            if (store.oldestFirst) {
              c.scrollTop = c.scrollHeight
            } else {
              c.scrollTop = 0
            }
            transitioningRef.current = false
            setTimeout(() => {
              if (!scrollRef.current) return
              if (store.oldestFirst) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              } else {
                scrollRef.current.scrollTop = 0
              }
            }, 100)
          })
        }
      } else {
        // Auto-scroll to reveal new messages if user hasn't deliberately
        // scrolled far away. Also scrolls if they're near the edge even if
        // userScrolledRef is true (mouse hover can cause minor drift).
        const container = scrollRef.current
        const nearEdge = container ? isAtLatestEdge(container) : false
        if ((!userScrolledRef.current || nearEdge) && !justSentRef.current) {
          programmaticScrollRef.current = true
          setTimeout(() => { programmaticScrollRef.current = false }, 1200)
          requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const c = scrollRef.current
            if (!c) return
            if (store.oldestFirst) {
              c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' })
            } else {
              c.scrollTo({ top: 0, behavior: 'smooth' })
            }
          })
          })
        }
      }
    }
    prevMsgCountRef.current = newCount
    prevLastMsgIdRef.current = lastMsgId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, lastMsgId, store.oldestFirst])

  // After sending: snap scroll to the latest edge synchronously on the same
  // frame React commits the optimistic message. useLayoutEffect runs before
  // the browser paints, so there is zero visual jump.
  useLayoutEffect(() => {
    if (!needsSendScrollRef.current) return
    needsSendScrollRef.current = false
    const c = scrollRef.current
    if (c) {
      if (store.oldestFirst) { c.scrollTop = c.scrollHeight }
      else { c.scrollTop = 0 }
    }
    // Keep guards active briefly so the scroll settles before handleScroll
    // or the auto-scroll effect can interfere.
    setTimeout(() => {
      programmaticScrollRef.current = false
      justSentRef.current = false
    }, 300)
  })

  // For unified_streams, also scroll to latest when messages finish loading (buffer complete)
  const prevUnifiedLoading = useRef(store.unifiedLoading)
  useEffect(() => {
    if (view?.type === 'unified_streams' && prevUnifiedLoading.current && !store.unifiedLoading && scrollRef.current) {
      // Reset userScrolled so that messages arriving right after the initial
      // load (e.g. from the first poll patchUnifiedStreams) still auto-scroll.
      userScrolledRef.current = false
      programmaticScrollRef.current = true
      setTimeout(() => { programmaticScrollRef.current = false }, 500)
      setShowJumpToLatest(false)
      requestAnimationFrame(() => {
        const c = scrollRef.current
        if (!c) return
        if (store.oldestFirst) {
          c.scrollTop = c.scrollHeight
        } else {
          c.scrollTop = 0
        }
      })
    }
    prevUnifiedLoading.current = store.unifiedLoading
  }, [store.unifiedLoading, view?.type, store.oldestFirst])

  const highlightMsg = useCallback((el: HTMLElement) => {
    const container = scrollRef.current
    if (!container) return

    programmaticScrollRef.current = true

    // Calculate where the element is relative to the scroll container
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const padding = 48 // generous padding to ensure full visibility

    const msgH = el.offsetHeight
    const viewportH = container.clientHeight

    // Offset of the element's top edge relative to the container's scroll position
    const elTopInScroll = container.scrollTop + (elRect.top - containerRect.top)

    let targetScrollTop: number
    if (msgH > viewportH - padding * 2) {
      // Message is taller than visible area: align top with padding
      targetScrollTop = elTopInScroll - padding
    } else {
      // Center the message vertically
      targetScrollTop = elTopInScroll - (viewportH / 2) + (msgH / 2)
    }

    // Clamp to valid scroll range
    const maxScroll = container.scrollHeight - container.clientHeight
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))

    container.scrollTo({ top: targetScrollTop, behavior: 'instant' })

    // Verify after scroll that the full message is visible; nudge if clipped
    requestAnimationFrame(() => {
      const rect2 = el.getBoundingClientRect()
      const cRect2 = container.getBoundingClientRect()
      if (rect2.bottom > cRect2.bottom - 16) {
        container.scrollTop += (rect2.bottom - cRect2.bottom) + 24
      } else if (rect2.top < cRect2.top + 16) {
        container.scrollTop -= (cRect2.top - rect2.top) + 24
      }
      setTimeout(() => { programmaticScrollRef.current = false }, 200)
    })

    el.setAttribute('data-highlight', '')
    setTimeout(() => el.removeAttribute('data-highlight'), 2200)
  }, [])

  const scrollToMsg = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) highlightMsg(el)
  }, [highlightMsg])

  // After messages load, if there's a pending scroll target (from toast click), scroll to it.
  // We use a ref + generation counter so rapid toast clicks cancel stale retry loops.
  const pendingMsgId = store.pendingScrollToMsgId
  const clearPendingScroll = store.setPendingScrollToMsgId
  const scrollGenRef = useRef(0)
  useEffect(() => {
    if (!pendingMsgId || messages.length === 0) return
    const gen = ++scrollGenRef.current
    console.log('[v0] pendingScroll: starting', { pendingMsgId, gen, msgCount: messages.length })
    // Prevent auto-scroll effect and handleScroll from interfering
    userScrolledRef.current = false
    programmaticScrollRef.current = true
    let attempts = 0
    const maxAttempts = 20
    function tryScroll() {
      // If a newer toast click has started its own loop, bail out
      if (scrollGenRef.current !== gen) {
        console.log('[v0] pendingScroll: CANCELLED (stale gen)', { gen, currentGen: scrollGenRef.current })
        return
      }
      const el = document.getElementById(`msg-${pendingMsgId}`)
      if (el) {
        console.log('[v0] pendingScroll: FOUND element', { pendingMsgId, attempts })
        // Use requestAnimationFrame to ensure layout is committed
        requestAnimationFrame(() => {
          if (scrollGenRef.current !== gen) return
          highlightMsg(el)
          clearPendingScroll(null)
        })
      } else if (++attempts < maxAttempts) {
        console.log('[v0] pendingScroll: element not found, retrying', { pendingMsgId, attempts })
        setTimeout(tryScroll, 200)
      } else {
        console.log('[v0] pendingScroll: GAVE UP after', maxAttempts, 'attempts for', pendingMsgId)
        clearPendingScroll(null)
        programmaticScrollRef.current = false
      }
    }
    // Give the view switch time to commit its first render
    setTimeout(tryScroll, 150)
  }, [messages.length, pendingMsgId, clearPendingScroll, highlightMsg])

  // Auto-resize textarea after every render where mainInput changes.
  // Running in useEffect (after commit) ensures React has set the controlled
  // value on the DOM element, so scrollHeight reflects the actual content.
  // Also re-anchors scroll to bottom when input grows (inputBottom mode),
  // so the last message stays visible above the expanding input bar.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const prevH = el.offsetHeight
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    const newH = el.offsetHeight
    // If textarea grew/shrank and input is at bottom, re-anchor scroll
    if (store.inputBottom && scrollRef.current && prevH !== newH && !userScrolledRef.current && !justSentRef.current) {
      if (store.oldestFirst) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      } else {
        scrollRef.current.scrollTop = 0
      }
    }
  }, [mainInput, store.inputBottom, store.oldestFirst])

  // Current chat's alert words
  const chatId = view?.id || ''
  const currentChatAlerts = store.chatAlertWords[chatId] || []

  const handleReplyTo = useCallback((msg: GroupMeMessage) => {
    setReplyingTo(msg)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  async function handleSend() {
    if (!mainInput.trim()) return
    const attachments: GroupMeMessage['attachments'] = []
    if (store.pendingImage) {
      attachments.push({ type: 'image', url: store.pendingImage })
    }
    if (replyingTo) {
      attachments.push({ type: 'reply', reply_id: replyingTo.id, base_reply_id: replyingTo.id })
    }

    // Clear input immediately so the user sees feedback right away
    const textToSend = mainInput.trim()
    const replyRef = replyingTo
    const pendingImg = store.pendingImage
    setMainInput('')
    setReplyingTo(null)
    store.setPendingImage(null)

    // justSentRef tells the auto-scroll effect to skip (handleSend owns
    // the single scroll) and tells handleScroll to ignore reflow events.
    userScrolledRef.current = false
    justSentRef.current = true
    programmaticScrollRef.current = true
    needsSendScrollRef.current = true
    setShowJumpToLatest(false)
    setNewMsgCount(0)
    snapshotMsgCountRef.current = 0

    // If replying from an aggregate view (all, dms, stream, unified_streams),
    // route the message directly to the replied-to message's group or DM
    const isAggregate = view?.type === 'all' || view?.type === 'dms' || view?.type === 'stream' || view?.type === 'unified_streams'
  if (replyRef && isAggregate) {
  const groupId = replyRef.group_id
  if (groupId) {
  store.sendMessageDirect('group', groupId, textToSend, attachments)
  } else {
  // For DMs: find the other user. If the sender is us, use recipient_id or
  // extract from conversation_id. If the sender is someone else, reply to them.
  const senderId = replyRef.sender_id || replyRef.user_id
  const isSelfMsg = senderId === store.user?.id
  let dmTarget = ''
  if (isSelfMsg) {
    // We sent this message -- find the other user from conversation_id or recipient_id
    dmTarget = replyRef.recipient_id || ''
    if (!dmTarget && replyRef.conversation_id) {
      dmTarget = replyRef.conversation_id.split('+').find(id => id !== store.user?.id) || ''
    }
  } else {
    dmTarget = senderId || ''
  }
  if (dmTarget) {
    store.sendMessageDirect('dm', dmTarget, textToSend, attachments)
  }
  }
    } else {
      // Fire-and-forget: sendMessage inserts an optimistic message synchronously
      // via setPanelMessages before the await, so the message appears immediately.
      store.sendMessage(panelIdx, textToSend, attachments)
    }
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

  // Reset noMore and reply context when view changes
  useEffect(() => { setNoMoreMessages(false); setReplyingTo(null) }, [view?.type, view?.id])

  // DM recipient name for watermark, header, and placeholder
  const dmRecipientName = useMemo(() => {
    if (view?.type !== 'dm' || !view.id) return null
    const chat = store.dmChats.find(d => d.other_user?.id === view.id)
    if (chat?.other_user?.name) return chat.other_user.name
    // Fallback: look up from group member lists (for new DMs with no prior messages)
    for (const g of store.groups) {
      const member = g.members?.find((m: { user_id: string; nickname: string }) => m.user_id === view.id)
      if (member?.nickname) return member.nickname
    }
    return null
  }, [view?.type, view?.id, store.dmChats, store.groups])

  const isSpecificView = view?.type === 'group' || view?.type === 'dm' || view?.type === 'stream'
  const canSend = isSpecificView || !!replyingTo

  const inputSection = (
    <div className={`${store.compact ? 'px-2 py-1.5' : 'px-3 py-2'} border-b border-border bg-card relative z-20 overflow-visible`}>
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
              onClick={() => setMainInput(prev => prev ? `${prev} ${tpl}` : tpl)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-[var(--d360-orange)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {tpl}
            </button>
          ))}
        </div>
      )}

      {/* Reply context snippet */}
      {replyingTo && (() => {
        const isAggregate = view?.type === 'all' || view?.type === 'dms' || view?.type === 'stream' || view?.type === 'unified_streams'
        const replyGroupName = replyingTo.group_id ? store.groups.find(g => g.id === replyingTo.group_id)?.name : null
        return (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg border-l-3 border-l-[var(--d360-orange)] bg-secondary/30 border border-border">
          <Reply className="w-3.5 h-3.5 text-[var(--d360-orange)] shrink-0 rotate-180" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-bold text-[var(--d360-orange)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {replyingTo.name}
              </span>
            {isAggregate && (replyGroupName || !replyingTo.group_id) && (
              <span className="text-[9px] text-muted-foreground/60" style={{ fontFamily: 'var(--font-mono)' }}>
                {replyGroupName ? `in ${replyGroupName}` : 'in DM'}
              </span>
              )}
            </div>
            <span
              className="text-[10px] text-muted-foreground line-clamp-1"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {replyingTo.text || '(attachment)'}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        )
      })()}

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
          onChange={e => setMainInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); if (textareaRef.current) { textareaRef.current.style.height = 'auto' } }
          }}
  placeholder={canSend ? (replyingTo && !isSpecificView ? `Reply to ${replyingTo.name}...` : `Message ${dmRecipientName || title}...`) : 'Select a chat or reply to a message'}
  disabled={!canSend}
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

          {/* Emoji picker overlay -- inside ref so outside-click detection works */}
          {mainEmojiOpen && (
            <div className={`absolute right-0 rounded-xl p-3 grid grid-cols-6 gap-1.5 shadow-xl bg-card border border-border ${
              store.inputBottom ? 'bottom-full mb-2' : 'top-full mt-2'
            }`} style={{ zIndex: 9999, minWidth: '232px' }}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => {
                    setMainInput(prev => prev + e)
                    setMainEmojiOpen(false)
                  }}
                  className="text-base hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send */}
        <button
          onClick={() => { handleSend(); if (textareaRef.current) textareaRef.current.style.height = 'auto' }}
          disabled={!mainInput.trim() || !canSend}
          className="p-2 rounded-lg disabled:opacity-30 transition-all hover:brightness-110 shrink-0 text-white"
          style={{ background: 'var(--d360-gradient)' }}
          title="Send (Enter)"
        >
          <Send className="w-4 h-4" />
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
        className={`flex-1 overflow-y-auto overflow-x-hidden px-3 pt-2 pb-4 flex flex-col min-h-0 ${store.compact ? 'gap-0.5' : 'gap-1.5'}`}
        style={store.boardGradient ? {
          background: `linear-gradient(${store.boardGradient.angle}deg, rgb(${store.boardGradient.start.join(',')}), rgb(${store.boardGradient.end.join(',')}))`,
          ['--board-text' as string]: boardTextColor,
          ['--board-muted' as string]: boardMutedColor,
          color: boardTextColor,
        } : undefined}
      >


        {/* Loading gate: show spinner while view is loading (empty messages before first load, or unified syncing) */}
        {(store.unifiedLoading && view?.type === 'unified_streams') || (messages.length === 0 && view && view.type !== 'unified_streams' && !viewLoaded) ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-border" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[var(--d360-orange)] animate-spin" />
            </div>
            {view?.type === 'unified_streams' && (
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Syncing streams</p>
            )}
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
                    <MessageCard key={m.id} msg={m} panelIdx={panelIdx} showGroupTag={showGroupTag} onScrollToMsg={scrollToMsg} onReply={handleReplyTo} replyNameMap={replyNameMap} />
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
                  onReply={handleReplyTo}
                  replyNameMap={replyNameMap}
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
              <div className="flex-1 flex flex-col items-center justify-center gap-1">
                <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {view?.type === 'unified_streams'
                    ? 'Toggle streams to see messages'
                    : view?.type === 'dm' && dmRecipientName
                      ? `No messages yet with ${dmRecipientName}`
                      : view
                        ? 'Loading messages...'
                        : 'Select a chat'}
                </p>
                {view?.type === 'dm' && dmRecipientName && (
                  <p className="text-[10px] text-muted-foreground/50" style={{ fontFamily: 'var(--font-mono)' }}>
                    Send a message to start the conversation
                  </p>
                )}
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

      {/* Jump to latest / new messages button */}
      {showJumpToLatest && (
        <button
          onClick={jumpToLatest}
          className={`absolute right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10px] uppercase tracking-widest font-semibold shadow-lg hover:brightness-110 transition-all z-10 ${
            store.inputBottom ? (replyingTo ? 'bottom-32' : 'bottom-20') : 'bottom-4'
          } ${newMsgCount > 0 ? 'animate-pulse' : ''}`}
          style={{ background: newMsgCount > 0 ? 'var(--d360-orange)' : 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
        >
          {store.oldestFirst ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
          {newMsgCount > 0 ? (
            <>{newMsgCount} new message{newMsgCount !== 1 ? 's' : ''}</>
          ) : (
            <>Latest</>
          )}
        </button>
      )}
    </div>
  )
}
