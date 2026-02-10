'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import type {
  GroupMeUser,
  GroupMeGroup,
  GroupMeDMChat,
  GroupMeMessage,
  ViewState,
  StreamsMap,
  UserStatus,
  TeamMemberStatus,
  SoundName,
  StickyNote,
  StickyHistoryEntry,
  PanelState,
} from './types'
import { api } from './groupme-api'
import { storage } from './storage'
import { playSound } from './sounds'

function sendDesktopNotification(title: string, body: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'd360-msg-' + Date.now(),
      silent: false,
    })
    // Auto-close after 5 seconds, focus tab on click
    n.onclick = () => { window.focus(); n.close() }
    setTimeout(() => n.close(), 5000)
  } catch { /* SW-only env */ }
}

interface StoreState {
  // Auth
  user: GroupMeUser | null
  isLoggedIn: boolean
  isLoggingIn: boolean
  // Data
  groups: GroupMeGroup[]
  dmChats: GroupMeDMChat[]
  // View
  currentView: ViewState
  // Secondary panels
  panels: (PanelState | null)[]
  activePanelIdx: number
  // Sidebar
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  sortMode: 'recent' | 'heat'
  inactiveOpen: boolean
  // Messages per panel
  panelMessages: GroupMeMessage[][]
  // Streams
  streams: StreamsMap
  streamToggles: Set<string>
  // Settings
  theme: 'dark' | 'light'
  compact: boolean
  inputBottom: boolean
  oldestFirst: boolean
  autoScroll: boolean
  globalMute: boolean
  feedSound: SoundName
  dmSound: SoundName
  unifiedSound: SoundName
  feedMuted: boolean
  dmMuted: boolean
  unifiedMuted: boolean
  allNotif: boolean
  boardGradient: { start: [number, number, number]; end: [number, number, number]; angle: number } | null
  // Tracking
  lastSeen: Record<string, number>
  approved: Record<string, boolean>
  pinnedMessages: Record<string, number>
  pinnedChats: Record<string, boolean>
  mutedGroups: Record<string, boolean>
  // Templates & alerts
  templates: string[]
  alertWords: string[]
  // Sticky notes
  stickies: Record<string, StickyNote>
  stickyHistory: StickyHistoryEntry[]
  // Status
  myStatus: UserStatus
  teamStatus: Record<string, TeamMemberStatus>
  syncGroupId: string | null
  // Connection
  isConnected: boolean
  // UI panels
  configOpen: boolean
  configTab: string | null
  searchOpen: boolean
  membersOpen: boolean
  contactsOpen: boolean
  clipboardOpen: boolean
  stickyOpen: boolean
  lightboxUrl: string | null
  // Modals
  forwardMsg: { id: string; name: string; text: string; groupId?: string } | null
  adhocOpen: boolean
  shiftChangeOpen: boolean
  msgBuilderOpen: boolean
  orderSearchOpen: boolean
  // Pending image
  pendingImage: string | null
  // Search
  searchIndex: GroupMeMessage[]
  // Chat renames
  chatRenames: Record<string, string>
  // Stream renames
  streamRenames: Record<string, string>
  // Section order
  sectionOrder: string[]
  // Editing a stream (prefill config)
  editingStream: { name: string; ids: string[]; sound: SoundName } | null
  // Per-chat alert words
  chatAlertWords: Record<string, string[]>
  // Per-chat alert sounds
  chatSounds: Record<string, SoundName>
  // Unified streams loading
  unifiedLoading: boolean
}

interface StoreActions {
  login: (token: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  switchView: (type: ViewState['type'], id: string | null) => void
  openSecondaryPanel: (type: ViewState['type'], id: string | null) => void
  closePanel: (slot: number) => void
  setActivePanel: (idx: number) => void
  refreshData: () => Promise<void>
  sendMessage: (panelIdx: number, text: string, attachments?: GroupMeMessage['attachments']) => Promise<void>
  likeMessage: (groupId: string, messageId: string) => Promise<void>
  unlikeMessage: (groupId: string, messageId: string) => Promise<void>
  deleteMessage: (groupId: string, messageId: string) => Promise<void>
  toggleTheme: () => void
  toggleCompact: () => void
  toggleInputBottom: () => void
  toggleOldestFirst: () => void
  setAutoScroll: (v: boolean) => void
  toggleGlobalMute: () => void
  toggleSidebar: () => void
  toggleSidebarMobile: () => void
  setSortMode: (m: 'recent' | 'heat') => void
  setInactiveOpen: (v: boolean) => void
  setFeedSound: (s: SoundName) => void
  setDmSound: (s: SoundName) => void
  setUnifiedSound: (s: SoundName) => void
  setFeedMuted: (v: boolean) => void
  setDmMuted: (v: boolean) => void
  setUnifiedMuted: (v: boolean) => void
  setAllNotif: (v: boolean) => void
  setBoardGradient: (v: { start: [number, number, number]; end: [number, number, number]; angle: number } | null) => void
  loadMoreMessages: (panelIdx: number) => Promise<number>
  loadingMore: boolean
  markSeen: (id: string) => void
  isUnread: (id: string, ts: number) => boolean
  approveDM: (uid: string) => void
  blockDM: (uid: string) => void
  togglePinMessage: (mid: string) => void
  togglePinChat: (id: string) => void
  toggleMuteGroup: (gid: string) => void
  setTemplates: (t: string[]) => void
  setAlertWords: (w: string[]) => void
  setChatAlertWords: (chatId: string, words: string[]) => void
  saveStream: (name: string, ids: string[], sound: SoundName) => void
  deleteStream: (name: string) => void
  toggleStreamMonitor: (name: string) => void
  setMyStatus: (s: UserStatus, broadcast?: boolean) => void
  setConfigOpen: (v: boolean, tab?: string) => void
  setSearchOpen: (v: boolean) => void
  setMembersOpen: (v: boolean) => void
  setContactsOpen: (v: boolean) => void
  setClipboardOpen: (v: boolean) => void
  setStickyOpen: (v: boolean) => void
  setLightboxUrl: (url: string | null) => void
  setForwardMsg: (msg: StoreState['forwardMsg']) => void
  setAdhocOpen: (v: boolean) => void
  setShiftChangeOpen: (v: boolean) => void
  setMsgBuilderOpen: (v: boolean) => void
  setOrderSearchOpen: (v: boolean) => void
  saveStickyNote: (key: string, text: string, expHours: number) => void
  uploadImage: (file: File) => Promise<string | null>
  setPendingImage: (url: string | null) => void
  showToast: (title: string, body: string, isPriority?: boolean) => void
  loadMessages: (panelIdx: number) => Promise<void>
  loadUnifiedStreams: () => Promise<void>
  getPanelTitle: (type: ViewState['type'], id: string | null) => string
  renameChat: (id: string, name: string) => void
  clearChatRename: (id: string) => void
  getChatDisplayName: (id: string, originalName: string) => string
  renameStream: (key: string, displayName: string) => void
  clearStreamRename: (key: string) => void
  getStreamDisplayName: (key: string) => string
  setSectionOrder: (order: string[]) => void
  setEditingStream: (v: StoreState['editingStream']) => void
  reorderStreams: (fromIdx: number, toIdx: number) => void
  setChatSound: (id: string, sound: SoundName) => void
  clearChatSound: (id: string) => void
}

interface ToastItem {
  id: number
  title: string
  body: string
  isPriority: boolean
  groupId?: string
}

const StoreContext = createContext<(StoreState & StoreActions & { toasts: ToastItem[]; removeToast: (id: number) => void }) | null>(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be inside StoreProvider')
  return ctx
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GroupMeUser | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [groups, setGroups] = useState<GroupMeGroup[]>([])
  const [dmChats, setDmChats] = useState<GroupMeDMChat[]>([])
  const [currentView, setCurrentView] = useState<ViewState>({ type: 'all', id: null })
  const [panels, setPanels] = useState<(PanelState | null)[]>([null, null, null])
  const [activePanelIdx, setActivePanelIdx] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [sortMode, setSortModeState] = useState<'recent' | 'heat'>('recent')
  const [inactiveOpen, setInactiveOpenState] = useState(false)
  const [panelMessages, setPanelMessages] = useState<GroupMeMessage[][]>([[], [], []])
  const [streams, setStreams] = useState<StreamsMap>({})
  const [streamToggles, setStreamToggles] = useState<Set<string>>(new Set())
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [compact, setCompact] = useState(false)
  const [inputBottom, setInputBottom] = useState(false)
  const [oldestFirst, setOldestFirst] = useState(false)
  const [autoScroll, setAutoScrollState] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [globalMute, setGlobalMute] = useState(false)
  const [feedSound, setFeedSoundState] = useState<SoundName>('radar')
  const [dmSound, setDmSoundState] = useState<SoundName>('chime')
  const [unifiedSound, setUnifiedSoundState] = useState<SoundName>('beacon')
  const [feedMuted, setFeedMutedState] = useState(false)
  const [dmMuted, setDmMutedState] = useState(false)
  const [unifiedMuted, setUnifiedMutedState] = useState(false)
  const [allNotif, setAllNotifState] = useState(false)
  const [boardGradient, setBoardGradientState] = useState<{ start: [number, number, number]; end: [number, number, number]; angle: number } | null>(null)
  const [lastSeen, setLastSeen] = useState<Record<string, number>>({})
  const [approved, setApproved] = useState<Record<string, boolean>>({})
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, number>>({})
  const [pinnedChats, setPinnedChats] = useState<Record<string, boolean>>({})
  const [mutedGroups, setMutedGroups] = useState<Record<string, boolean>>({})
  const [templates, setTemplatesState] = useState<string[]>([])
  const [alertWords, setAlertWordsState] = useState<string[]>([])
  const [stickies, setStickies] = useState<Record<string, StickyNote>>({})
  const [stickyHistory, setStickyHistory] = useState<StickyHistoryEntry[]>([])
  const [myStatus, setMyStatusState] = useState<UserStatus>('awy')
  const [teamStatus, setTeamStatus] = useState<Record<string, TeamMemberStatus>>({})
  const [syncGroupId, setSyncGroupId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [configOpen, setConfigOpenState] = useState(false)
  const [configTab, setConfigTab] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [clipboardOpen, setClipboardOpen] = useState(false)
  const [stickyOpen, setStickyOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [forwardMsg, setForwardMsg] = useState<StoreState['forwardMsg']>(null)
  const [adhocOpen, setAdhocOpen] = useState(false)
  const [shiftChangeOpen, setShiftChangeOpen] = useState(false)
  const [msgBuilderOpen, setMsgBuilderOpen] = useState(false)
  const [orderSearchOpen, setOrderSearchOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [searchIndex, setSearchIndex] = useState<GroupMeMessage[]>([])
  const [chatSounds, setChatSounds] = useState<Record<string, SoundName>>({})
  const [chatAlertWords, setChatAlertWordsState] = useState<Record<string, string[]>>({})
  const [unifiedLoading, setUnifiedLoading] = useState(false)
  const [editingStream, setEditingStream] = useState<StoreState['editingStream']>(null)
  const [chatRenames, setChatRenames] = useState<Record<string, string>>({})
  const [streamRenames, setStreamRenames] = useState<Record<string, string>>({})
  const [sectionOrder, setSectionOrderState] = useState<string[]>(['command', 'streams', 'pending', 'pinned', 'active', 'inactive'])
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastIdRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const knownMsgIds = useRef<Set<string>[]>([new Set(), new Set(), new Set()])
  const isLoggingInRef = useRef(false)

  // Load persisted settings on mount
  useEffect(() => {
    setTheme(storage.getTheme())
    setCompact(storage.getCompact())
    setInputBottom(storage.getInputBottom())
    setOldestFirst(storage.getOldestFirst())
    setAutoScrollState(storage.getAutoScroll())
    setGlobalMute(storage.getGlobalMute())
    setFeedSoundState(storage.getFeedSound() as SoundName)
    setDmSoundState(storage.getDmSound() as SoundName)
    setUnifiedSoundState(storage.getUnifiedSound() as SoundName)
    setFeedMutedState(storage.getFeedMuted())
    setDmMutedState(storage.getDmMuted())
    setUnifiedMutedState(storage.getUnifiedMuted())
    setAllNotifState(storage.getAllNotif())
    setBoardGradientState(storage.getBoardGradient())
    setLastSeen(storage.getLastSeen())
    setApproved(storage.getApproved())
    setPinnedMessages(storage.getPinned())
    setPinnedChats(storage.getPinnedChats())
    setMutedGroups(storage.getMuted())
    setTemplatesState(storage.getTemplates())
    setAlertWordsState(storage.getAlertWords())
    setStreams(storage.getStreams() as StreamsMap)
    setStickies(storage.getStickies())
    setStickyHistory(storage.getStickyHistory())
    setMyStatusState(storage.getStatus() as UserStatus)
    setSortModeState(storage.getSortMode())
    setInactiveOpenState(storage.getInactiveOpen())
    setSidebarCollapsed(storage.getSidebarCollapsed())
    setChatRenames(storage.getChatRenames())
    setStreamRenames(storage.getStreamRenames())
    setSectionOrderState(storage.getSectionOrder())
    setChatSounds(storage.getChatSounds() as Record<string, SoundName>)
    setChatAlertWordsState(storage.getChatAlertWords())

    // Auto-login
    const token = storage.getToken()
    if (token) {
      api.setToken(token)
      autoLogin(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply theme to html
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  async function autoLogin(token: string) {
    setIsLoggingIn(true)
    isLoggingInRef.current = true
    try {
      api.setToken(token)
      const me = await api.getMe()
      setUser(me)
      const [g, d] = await Promise.all([api.getGroups(), api.getDMChats()])
      setGroups(g)
      setDmChats(d)
      // Auto-approve any pending DMs on login
      const storedApproved = storage.getApproved()
      const updatedApproved = { ...storedApproved }
      d.forEach((dm: GroupMeDMChat) => {
        const uid = dm.other_user?.id
        if (uid && !(uid in updatedApproved)) updatedApproved[uid] = true
      })
      setApproved(updatedApproved)
      storage.setApproved(updatedApproved)
      const sync = g.find(gr => gr.name.toLowerCase() === 'dispatch')
      if (sync) setSyncGroupId(sync.id)
      setIsLoggedIn(true)
      setIsConnected(true)
      startPolling()
    } catch {
      storage.removeToken()
    } finally {
      setIsLoggingIn(false)
      isLoggingInRef.current = false
    }
  }

  const login = useCallback(async (token: string) => {
    setIsLoggingIn(true)
    isLoggingInRef.current = true
    try {
      api.setToken(token)
      const me = await api.getMe()
      storage.setToken(token)
      setUser(me)
      const [g, d] = await Promise.all([api.getGroups(), api.getDMChats()])
      setGroups(g)
      setDmChats(d)
      // Auto-approve any pending DMs on login
      const storedApproved = storage.getApproved()
      const updatedApproved = { ...storedApproved }
      d.forEach((dm: GroupMeDMChat) => {
        const uid = dm.other_user?.id
        if (uid && !(uid in updatedApproved)) updatedApproved[uid] = true
      })
      setApproved(updatedApproved)
      storage.setApproved(updatedApproved)
      const sync = g.find(gr => gr.name.toLowerCase() === 'dispatch')
      if (sync) setSyncGroupId(sync.id)
      setIsLoggedIn(true)
      setIsConnected(true)
      startPolling()
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      return { success: true }
    } catch {
      return { success: false, error: 'Invalid token. Please try again.' }
    } finally {
      setIsLoggingIn(false)
      isLoggingInRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = useCallback(() => {
  storage.removeToken()
  api.setToken('')
  if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
  // Clear first-time user flags so next login shows onboarding
  localStorage.removeItem('d360_tutorial_done')
  localStorage.removeItem('d360_guide_dismissed')
  setIsLoggedIn(false)
  setUser(null)
  setGroups([])
  setDmChats([])
  setCurrentView({ type: 'all', id: null })
  }, [])

  function startPolling() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    pollLoop()
  }

  async function pollLoop() {
    try {
      const [g, d] = await Promise.all([api.getGroups(), api.getDMChats()])
      setGroups(g)
      setDmChats(d)
      const sync = g.find(gr => gr.name.toLowerCase() === 'dispatch')
      if (sync) {
        setSyncGroupId(sync.id)
        await pollDispatchStatus(sync.id)
      }
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
    pollTimerRef.current = setTimeout(pollLoop, 4000)
  }

  async function pollDispatchStatus(gid: string) {
    try {
      const data = await api.getGroupMessages(gid, 20)
      const msgs = data.messages || []
      const statuses: Record<string, TeamMemberStatus> = {}
      for (const m of msgs) {
        if (!m.text) continue
        const match = m.text.match(/^(🟢|🔴|🟡)\s+(.+?)\s+[—–-]\s+(AVAILABLE|BUSY|AWAY)$/i)
        if (match) {
          const uid = m.user_id || m.sender_id || ''
          if (!statuses[uid]) {
            const statusMap: Record<string, UserStatus> = { AVAILABLE: 'avl', BUSY: 'bsy', AWAY: 'awy' }
            statuses[uid] = {
              name: match[2],
              status: statusMap[match[3].toUpperCase()] || 'awy',
              userId: uid,
              timestamp: m.created_at,
            }
          }
        }
      }
      setTeamStatus(statuses)
    } catch { /* ignore */ }
  }

  const showToast = useCallback((title: string, body: string, isPriority = false) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, title, body, isPriority }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, isPriority ? 10000 : 6000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const getPanelTitle = useCallback((type: ViewState['type'], id: string | null) => {
    if (type === 'all') return 'Universal Feed'
    if (type === 'dms') return 'Direct Comms'
    if (type === 'group') return groups.find(g => g.id === id)?.name || 'Group'
    if (type === 'dm') {
      const dm = dmChats.find(d => d.other_user?.id === id)
      return dm?.other_user?.name || 'DM'
    }
    if (type === 'stream') return id || 'Stream'
    if (type === 'unified_streams') return 'Unified Streams'
    return '--'
  }, [groups, dmChats])

  // Message cache: keyed by "type:id" to avoid refetching when switching back
  const msgCache = useRef<Record<string, { msgs: GroupMeMessage[]; ts: number }>>({})
  const CACHE_TTL = 10_000 // 10s -- show cached instantly, refresh in background

  const loadMessages = useCallback(async (panelIdx: number) => {
    const view = panelIdx === 0 ? currentView : panels[panelIdx]
    if (!view) return
    const { type, id } = view
    if (type === 'unified_streams') return

    const cacheKey = `${type}:${id || '_'}`
    const cached = msgCache.current[cacheKey]

    // Show cached messages instantly while we fetch fresh ones
    if (cached && cached.msgs.length > 0) {
      const isFresh = Date.now() - cached.ts < CACHE_TTL
      if (isFresh) {
        // Cache is fresh enough, just set it and return
        setPanelMessages(prev => {
          const next = [...prev]
          next[panelIdx] = cached.msgs
          return next
        })
        return
      }
      // Stale cache -- show it immediately, then refresh below
      setPanelMessages(prev => {
        const next = [...prev]
        next[panelIdx] = cached.msgs
        return next
      })
    }

    let msgs: GroupMeMessage[] = []
    try {
      if (type === 'group' && id) {
        const data = await api.getGroupMessages(id, 40)
        msgs = data.messages || []
      } else if (type === 'dm' && id) {
        const data = await api.getDMMessages(id, 40)
        msgs = data.direct_messages || []
      } else if (type === 'all') {
        const fetches = groups.slice(0, 6).map(g =>
          api.getGroupMessages(g.id, 5).catch(() => null)
        )
        const approvedDMs = dmChats.filter(d => approved[d.other_user?.id] !== false)
        const dmFetches = approvedDMs.slice(0, 2).map(d =>
          api.getDMMessages(d.other_user.id, 3).catch(() => null)
        )
        const results = await Promise.all([...fetches, ...dmFetches])
        results.forEach(r => {
          if (!r) return
          if ('messages' in r) msgs.push(...(r.messages || []))
          if ('direct_messages' in r) msgs.push(...(r.direct_messages || []))
        })
      } else if (type === 'dms') {
        const approvedDMs = dmChats.filter(d => approved[d.other_user?.id] !== false)
        const fetches = approvedDMs.slice(0, 8).map(d =>
          api.getDMMessages(d.other_user.id, 5).catch(() => null)
        )
        const results = await Promise.all(fetches)
        results.forEach(r => {
          if (r && 'direct_messages' in r) msgs.push(...(r.direct_messages || []))
        })
      } else if (type === 'stream' && id && streams[id]) {
        const stream = streams[id]
        const fetches = stream.ids.map(gid =>
          api.getGroupMessages(gid, 10).catch(() => null)
        )
        const results = await Promise.all(fetches)
        results.forEach(r => {
          if (r && 'messages' in r) msgs.push(...(r.messages || []))
        })
      }
    } catch { /* ignore */ }

    msgs.sort((a, b) => a.created_at - b.created_at)

    // Update cache
    msgCache.current[cacheKey] = { msgs, ts: Date.now() }

    // Detect new messages and play sound + desktop notification
    const oldIds = knownMsgIds.current[panelIdx]
    if (oldIds && oldIds.size > 0 && !globalMute) {
      const newMsgs = msgs.filter(m => !oldIds.has(m.id))
      if (newMsgs.length > 0) {
        const latest = newMsgs[newMsgs.length - 1]
        const notifBody = latest ? `${latest.name}: ${latest.text || '(attachment)'}` : ''

        if ((type === 'group' || type === 'all' || type === 'stream') && !feedMuted) {
          if (type === 'stream' && id && streams[id]) {
            playSound(streams[id].sound as SoundName)
          } else {
            playSound(feedSound)
          }
          const groupName = groups.find(g => g.id === (latest?.group_id || id))?.name || 'Group'
          sendDesktopNotification(`Delta 360 - ${groupName}`, notifBody)
        } else if ((type === 'dm' || type === 'dms') && !dmMuted) {
          playSound(dmSound)
          sendDesktopNotification('Delta 360 - DM', notifBody)
        }
      }
    }
    knownMsgIds.current[panelIdx] = new Set(msgs.map(m => m.id))

    // Batch index for search (single state update instead of per-message)
    const newForIndex = msgs.filter(m => m.text)
    if (newForIndex.length > 0) {
      setSearchIndex(prev => {
        const existingIds = new Set(prev.map(x => x.id))
        const toAdd = newForIndex.filter(m => !existingIds.has(m.id))
        if (toAdd.length === 0) return prev
        const next = [...prev, ...toAdd]
        return next.length > 2000 ? next.slice(-1500) : next
      })
    }

    setPanelMessages(prev => {
      const next = [...prev]
      next[panelIdx] = msgs
      return next
    })
  }, [currentView, panels, groups, dmChats, approved, streams, globalMute, feedMuted, dmMuted, feedSound, dmSound])

  // Load more (older) messages for the current panel using before_id pagination
  const loadMoreMessages = useCallback(async (panelIdx: number): Promise<number> => {
    const view = panelIdx === 0 ? currentView : panels[panelIdx]
    if (!view) return 0
    const { type, id } = view
    const existing = panelMessages[panelIdx] || []
    if (existing.length === 0) return 0

    // Find the oldest message ID
    const sorted = [...existing].sort((a, b) => a.created_at - b.created_at)
    const oldestId = sorted[0]?.id
    if (!oldestId) return 0

    setLoadingMore(true)
    let older: GroupMeMessage[] = []
    try {
      if (type === 'group' && id) {
        const data = await api.getGroupMessages(id, 40, oldestId)
        older = data.messages || []
      } else if (type === 'dm' && id) {
        const data = await api.getDMMessages(id, 40, oldestId)
        older = data.direct_messages || []
      }
    } catch { /* ignore */ }
    setLoadingMore(false)

    if (older.length === 0) return 0

    // Merge and deduplicate
    const existingIds = new Set(existing.map(m => m.id))
    const newMsgs = older.filter(m => !existingIds.has(m.id))
    if (newMsgs.length === 0) return 0

    const merged = [...existing, ...newMsgs].sort((a, b) => a.created_at - b.created_at)
    knownMsgIds.current[panelIdx] = new Set(merged.map(m => m.id))

    // Index new messages for search
    newMsgs.forEach(m => {
      if (m.text) {
        setSearchIndex(prev => {
          if (prev.find(x => x.id === m.id)) return prev
          const next = [...prev, m]
          return next.length > 2000 ? next.slice(-1500) : next
        })
      }
    })

    setPanelMessages(prev => {
      const next = [...prev]
      next[panelIdx] = merged
      return next
    })
    return newMsgs.length
  }, [currentView, panels, panelMessages])

  // Unified streams: single dedicated loader with version counter
  const unifiedKnownIds = useRef<Set<string>>(new Set())
  const unifiedVersion = useRef(0)
  const unifiedDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Snapshot current streams+toggles into refs so the async fetch always reads latest
  const streamsRef = useRef(streams)
  streamsRef.current = streams
  const streamTogglesRef = useRef(streamToggles)
  streamTogglesRef.current = streamToggles

  // Ref for sync loading gate (prevents race between setState and interval)
  const unifiedLoadingRef = useRef(unifiedLoading)
  unifiedLoadingRef.current = unifiedLoading

  // Core fetch function - returns sorted messages or null if stale/failed
  const fetchUnifiedMessages = useCallback(async (version: number): Promise<GroupMeMessage[] | null> => {
    const toggledIds = new Set<string>()
    Object.entries(streamsRef.current).forEach(([key, s]: [string, { ids: string[] }]) => {
      if (streamTogglesRef.current.has(key)) {
        s.ids.forEach(gid => toggledIds.add(gid))
      }
    })
    if (toggledIds.size === 0) return []
    try {
      // Fetch in small batches to avoid rate limits
      const groupIds = Array.from(toggledIds)
      const results: ({ messages: GroupMeMessage[] } | null)[] = []
      for (let i = 0; i < groupIds.length; i += 3) {
        if (version !== unifiedVersion.current) return null // stale
        const batch = groupIds.slice(i, i + 3).map(gid =>
          api.getGroupMessages(gid, 8).catch(() => null)
        )
        results.push(...await Promise.all(batch))
      }
      if (version !== unifiedVersion.current) return null // stale
      const all: GroupMeMessage[] = []
      results.forEach(r => {
        if (r && 'messages' in r) all.push(...(r.messages || []))
      })
      const seen = new Set<string>()
      const deduped = all.filter(m => {
        if (seen.has(m.id)) return false
        seen.add(m.id)
        return true
      })
      // Sort newest first, keep 60 most recent, then store ascending
      deduped.sort((a, b) => b.created_at - a.created_at)
      const ready = deduped.slice(0, 60)
      ready.sort((a, b) => a.created_at - b.created_at)
      return ready
    } catch {
      return null
    }
  }, [])

  // Buffered load: shows spinner, hides all messages until fully ready
  const loadUnifiedStreams = useCallback(async () => {
    const version = ++unifiedVersion.current
    unifiedLoadingRef.current = true
    setUnifiedLoading(true)
    setPanelMessages(prev => { const n = [...prev]; n[0] = []; return n })
    const ready = await fetchUnifiedMessages(version)
    if (ready === null || version !== unifiedVersion.current) return
    // Seed known IDs on initial load (no sound on first load)
    unifiedKnownIds.current = new Set(ready.map(m => m.id))
    setPanelMessages(prev => { const n = [...prev]; n[0] = ready; return n })
    unifiedLoadingRef.current = false
    setUnifiedLoading(false)
  }, [fetchUnifiedMessages])

  // Silent refresh: no spinner, atomically swaps messages in place
  const refreshUnifiedStreams = useCallback(async () => {
    const version = ++unifiedVersion.current
    const ready = await fetchUnifiedMessages(version)
    if (ready === null || version !== unifiedVersion.current) return
    // Play sound if new messages detected
  if (unifiedKnownIds.current.size > 0 && !globalMute && !unifiedMuted) {
  const newMsgs = ready.filter(m => !unifiedKnownIds.current.has(m.id))
  if (newMsgs.length > 0) {
    playSound(unifiedSound)
    const latest = newMsgs[newMsgs.length - 1]
    if (latest) sendDesktopNotification('Delta 360 - Streams', `${latest.name}: ${latest.text || '(attachment)'}`)
  }
  }
    unifiedKnownIds.current = new Set(ready.map(m => m.id))
    setPanelMessages(prev => { const n = [...prev]; n[0] = ready; return n })
  }, [fetchUnifiedMessages, globalMute, unifiedMuted, unifiedSound])

  // Trigger buffered load when toggles change or view switches to unified_streams
  const streamToggleCount = streamToggles.size
  useEffect(() => {
    if (currentView.type !== 'unified_streams' || !isLoggedIn) return
    // Immediately invalidate any in-flight calls and show spinner
    ++unifiedVersion.current
    unifiedLoadingRef.current = true // sync ref immediately to prevent interval races
    setUnifiedLoading(true)
    setPanelMessages(prev => { const n = [...prev]; n[0] = []; return n })
    // Debounce rapid toggles - wait for user to stop toggling
    if (unifiedDebounce.current) clearTimeout(unifiedDebounce.current)
    unifiedDebounce.current = setTimeout(() => {
      loadUnifiedStreams()
    }, 350)
    return () => {
      if (unifiedDebounce.current) clearTimeout(unifiedDebounce.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamToggleCount, currentView.type, isLoggedIn, loadUnifiedStreams])

  // Background refresh for unified_streams (silent - no spinner, atomic swap)
  useEffect(() => {
    if (currentView.type !== 'unified_streams' || !isLoggedIn) return
    const interval = setInterval(() => {
      if (!unifiedLoadingRef.current) refreshUnifiedStreams()
    }, 15000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView.type, isLoggedIn, refreshUnifiedStreams])

  const switchView = useCallback((type: ViewState['type'], id: string | null) => {
    setCurrentView({ type, id })
    if (id) {
      setLastSeen(prev => {
        const next = { ...prev, [id]: Math.floor(Date.now() / 1000) }
        storage.setLastSeen(next)
        return next
      })
    }
    // Pre-seed knownIds from cache to prevent false "new message" alerts
    const cacheKey = `${type}:${id || '_'}`
    const cached = msgCache.current[cacheKey]
    knownMsgIds.current[0] = cached ? new Set(cached.msgs.map(m => m.id)) : new Set()
    setSidebarMobileOpen(false)
  }, [])

  const openSecondaryPanel = useCallback((type: ViewState['type'], id: string | null) => {
    setPanels(prev => {
      const next = [...prev]
      const slot = !next[1] ? 1 : !next[2] ? 2 : 1
      next[slot] = { type, id }
      knownMsgIds.current[slot] = new Set()
      return next
    })
  }, [])

  const closePanel = useCallback((slot: number) => {
    if (slot === 0) {
      setPanels([null, null, null])
    } else {
      setPanels(prev => {
        const next = [...prev]
        next[slot] = null
        return next
      })
    }
  }, [])

  const sendMessage = useCallback(async (panelIdx: number, text: string, attachments: GroupMeMessage['attachments'] = []) => {
    const view = panelIdx === 0 ? currentView : panels[panelIdx]
    if (!view) return
    const { type, id } = view
    try {
      if (type === 'group' && id) {
        await api.sendGroupMessage(id, text, attachments)
      } else if (type === 'dm' && id) {
        await api.sendDM(id, text, attachments)
      }
      setPendingImage(null)
    } catch {
      showToast('Error', 'Failed to send message')
    }
  }, [currentView, panels, showToast])

  const markSeen = useCallback((id: string) => {
    setLastSeen(prev => {
      const next = { ...prev, [id]: Math.floor(Date.now() / 1000) }
      storage.setLastSeen(next)
      return next
    })
  }, [])

  const isUnread = useCallback((id: string, ts: number) => {
    return ts > (lastSeen[id] || 0)
  }, [lastSeen])

  const approveDM = useCallback((uid: string) => {
    setApproved(prev => {
      const next = { ...prev, [uid]: true }
      storage.setApproved(next)
      return next
    })
  }, [])

  const blockDM = useCallback((uid: string) => {
    setApproved(prev => {
      const next = { ...prev, [uid]: false }
      storage.setApproved(next)
      return next
    })
  }, [])

  const togglePinMessage = useCallback((mid: string) => {
    setPinnedMessages(prev => {
      const next = { ...prev }
      if (next[mid]) delete next[mid]
      else next[mid] = Date.now()
      storage.setPinned(next)
      return next
    })
  }, [])

  const togglePinChat = useCallback((id: string) => {
    setPinnedChats(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      storage.setPinnedChats(next)
      return next
    })
  }, [])

  const toggleMuteGroup = useCallback((gid: string) => {
    setMutedGroups(prev => {
      const next = { ...prev }
      if (next[gid]) delete next[gid]
      else next[gid] = true
      storage.setMuted(next)
      return next
    })
  }, [])

  const renameChat = useCallback((id: string, name: string) => {
    setChatRenames(prev => {
      const next = { ...prev, [id]: name }
      storage.setChatRenames(next)
      return next
    })
  }, [])

  const clearChatRename = useCallback((id: string) => {
    setChatRenames(prev => {
      const next = { ...prev }
      delete next[id]
      storage.setChatRenames(next)
      return next
    })
  }, [])

  const getChatDisplayName = useCallback((id: string, originalName: string) => {
    return chatRenames[id] || originalName
  }, [chatRenames])

  const setChatSoundAction = useCallback((id: string, sound: SoundName) => {
    setChatSounds(prev => {
      const next = { ...prev, [id]: sound }
      storage.setChatSounds(next)
      return next
    })
  }, [])

  const clearChatSound = useCallback((id: string) => {
    setChatSounds(prev => {
      const next = { ...prev }
      delete next[id]
      storage.setChatSounds(next)
      return next
    })
  }, [])

  const renameStream = useCallback((key: string, displayName: string) => {
    setStreamRenames(prev => {
      const next = { ...prev, [key]: displayName }
      storage.setStreamRenames(next)
      return next
    })
  }, [])

  const clearStreamRename = useCallback((key: string) => {
    setStreamRenames(prev => {
      const next = { ...prev }
      delete next[key]
      storage.setStreamRenames(next)
      return next
    })
  }, [])

  const getStreamDisplayName = useCallback((key: string) => {
    return streamRenames[key] || key
  }, [streamRenames])

  const setSectionOrder = useCallback((order: string[]) => {
    setSectionOrderState(order)
    storage.setSectionOrder(order)
  }, [])

  const saveStream = useCallback((name: string, ids: string[], sound: SoundName) => {
    setStreams(prev => {
      const next = { ...prev, [name]: { ids, sound } }
      storage.setStreams(next)
      return next
    })
  }, [])

  const deleteStream = useCallback((name: string) => {
    setStreams(prev => {
      const next = { ...prev }
      delete next[name]
      storage.setStreams(next)
      // If no streams left and viewing unified_streams or this stream, redirect
      if (Object.keys(next).length === 0) {
        setPanels(p => {
          const updated = [...p]
          if (updated[0]?.type === 'unified_streams' || (updated[0]?.type === 'stream' && updated[0]?.id === name)) {
            updated[0] = { type: 'all', id: null }
          }
          return updated
        })
      } else if (panels[0]?.type === 'stream' && panels[0]?.id === name) {
        setPanels(p => {
          const updated = [...p]
          updated[0] = { type: 'all', id: null }
          return updated
        })
      }
      return next
    })
    setStreamToggles(prev => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [panels])

  const toggleStreamMonitor = useCallback((name: string) => {
    setStreamToggles(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const reorderStreams = useCallback((fromIdx: number, toIdx: number) => {
    setStreams(prev => {
      const keys = Object.keys(prev)
      if (fromIdx < 0 || fromIdx >= keys.length || toIdx < 0 || toIdx >= keys.length) return prev
      const [moved] = keys.splice(fromIdx, 1)
      keys.splice(toIdx, 0, moved)
      const next: Record<string, { ids: string[]; sound: string }> = {}
      keys.forEach(k => { next[k] = prev[k] })
      storage.setStreams(next)
      return next
    })
  }, [])

  const setMyStatus = useCallback(async (s: UserStatus, broadcast = true) => {
    setMyStatusState(s)
    storage.setStatus(s)
    if (broadcast && syncGroupId && user) {
      const icons: Record<UserStatus, string> = { avl: '🟢', bsy: '🔴', awy: '🟡' }
      const labels: Record<UserStatus, string> = { avl: 'AVAILABLE', bsy: 'BUSY', awy: 'AWAY' }
      try {
        await api.sendGroupMessage(syncGroupId, `${icons[s]} ${user.name} \u2014 ${labels[s]}`)
      } catch { /* ignore */ }
    }
  }, [syncGroupId, user])

  const saveStickyNote = useCallback((key: string, text: string, expHours: number) => {
    setStickies(prev => {
      const next = { ...prev, [key]: { text, created: Date.now(), exp: expHours ? Date.now() + expHours * 3600000 : 0 } }
      storage.setStickies(next)
      return next
    })
    setStickyHistory(prev => {
      const next = [...prev, { key, text, ts: Date.now() }]
      const trimmed = next.length > 50 ? next.slice(-30) : next
      storage.setStickyHistory(trimmed)
      return trimmed
    })
    if (syncGroupId) {
      api.sendGroupMessage(syncGroupId, `[D360:STICKY] ${key}|${text}`).catch(() => {})
    }
    showToast('Saved', 'Sticky note saved')
  }, [syncGroupId, showToast])

  const uploadImage = useCallback(async (file: File) => {
    try {
      const url = await api.uploadImage(file)
      setPendingImage(url)
      showToast('Image', 'Uploaded successfully')
      return url
    } catch {
      showToast('Error', 'Upload failed')
      return null
    }
  }, [showToast])

  const refreshData = useCallback(async () => {
    try {
      const [g, d] = await Promise.all([api.getGroups(), api.getDMChats()])
      setGroups(g)
      setDmChats(d)
    } catch { /* ignore */ }
  }, [])

  const value = {
    // State
    user,
    isLoggedIn,
    isLoggingIn,
    groups,
    dmChats,
    currentView,
    panels,
    activePanelIdx,
    sidebarCollapsed,
    sidebarMobileOpen,
    sortMode,
    inactiveOpen,
    panelMessages,
    streams,
    streamToggles,
    theme,
    compact,
    inputBottom,
    oldestFirst,
    autoScroll,
    loadingMore,
    loadMoreMessages,
    globalMute,
    feedSound,
    dmSound,
    unifiedSound,
    feedMuted,
    dmMuted,
    unifiedMuted,
    allNotif,
    boardGradient,
    lastSeen,
    approved,
    pinnedMessages,
    pinnedChats,
    mutedGroups,
    templates,
    alertWords,
    stickies,
    stickyHistory,
    myStatus,
    teamStatus,
    syncGroupId,
    isConnected,
    configOpen,
    configTab,
    chatAlertWords,
    searchOpen,
    membersOpen,
    contactsOpen,
    clipboardOpen,
    stickyOpen,
    lightboxUrl,
    forwardMsg,
    adhocOpen,
    shiftChangeOpen,
    msgBuilderOpen,
    orderSearchOpen,
    pendingImage,
    searchIndex,
    chatRenames,
    streamRenames,
    sectionOrder,
    editingStream,
    chatSounds,
    unifiedLoading,
    toasts,
    // Actions
    login,
    logout,
    switchView,
    openSecondaryPanel,
    closePanel,
    setActivePanel: setActivePanelIdx,
    refreshData,
    sendMessage,
    likeMessage: async (gid: string, mid: string) => { try { await api.likeMessage(gid, mid) } catch {} },
    unlikeMessage: async (gid: string, mid: string) => { try { await api.unlikeMessage(gid, mid) } catch {} },
    deleteMessage: async (gid: string, mid: string) => {
      try {
        await api.deleteMessage(gid, mid)
      } catch {
        showToast('Error', 'Could not delete message')
      }
    },
    toggleTheme: () => {
      setTheme(prev => {
        const next = prev === 'dark' ? 'light' : 'dark'
        storage.setTheme(next)
        return next
      })
    },
    toggleCompact: () => {
      setCompact(prev => {
        const next = !prev
        storage.setCompact(next)
        return next
      })
    },
    toggleInputBottom: () => {
      setInputBottom(prev => {
        const next = !prev
        storage.setInputBottom(next)
        return next
      })
    },
    toggleOldestFirst: () => {
      setOldestFirst(prev => {
        const next = !prev
        storage.setOldestFirst(next)
        return next
      })
    },
    setAutoScroll: (v: boolean) => { setAutoScrollState(v); storage.setAutoScroll(v) },
    toggleGlobalMute: () => {
      setGlobalMute(prev => {
        const next = !prev
        storage.setGlobalMute(next)
        return next
      })
    },
    toggleSidebar: () => {
      setSidebarCollapsed(prev => {
        const next = !prev
        storage.setSidebarCollapsed(next)
        return next
      })
    },
    toggleSidebarMobile: () => setSidebarMobileOpen(prev => !prev),
    setSortMode: (m: 'recent' | 'heat') => {
      setSortModeState(m)
      storage.setSortMode(m)
    },
    setInactiveOpen: (v: boolean) => {
      setInactiveOpenState(v)
      storage.setInactiveOpen(v)
    },
    setFeedSound: (s: SoundName) => { setFeedSoundState(s); storage.setFeedSound(s) },
    setDmSound: (s: SoundName) => { setDmSoundState(s); storage.setDmSound(s) },
    setUnifiedSound: (s: SoundName) => { setUnifiedSoundState(s); storage.setUnifiedSound(s) },
    setFeedMuted: (v: boolean) => { setFeedMutedState(v); storage.setFeedMuted(v) },
    setDmMuted: (v: boolean) => { setDmMutedState(v); storage.setDmMuted(v) },
    setUnifiedMuted: (v: boolean) => { setUnifiedMutedState(v); storage.setUnifiedMuted(v) },
    setAllNotif: (v: boolean) => { setAllNotifState(v); storage.setAllNotif(v) },
    setBoardGradient: (v: { start: [number, number, number]; end: [number, number, number]; angle: number } | null) => { setBoardGradientState(v); storage.setBoardGradient(v) },
    markSeen,
    isUnread,
    approveDM,
    blockDM,
    togglePinMessage,
    togglePinChat,
    toggleMuteGroup,
    setTemplates: (t: string[]) => { setTemplatesState(t); storage.setTemplates(t) },
    setAlertWords: (w: string[]) => { setAlertWordsState(w); storage.setAlertWords(w) },
    renameChat,
    clearChatRename,
    getChatDisplayName,
    renameStream,
    clearStreamRename,
    getStreamDisplayName,
    setSectionOrder,
    setEditingStream,
    reorderStreams,
    setChatSound: setChatSoundAction,
    clearChatSound,
    saveStream,
    deleteStream,
    toggleStreamMonitor,
    setMyStatus,
    setConfigOpen: (v: boolean, tab?: string) => { setConfigOpenState(v); if (tab) setConfigTab(tab); else if (!v) setConfigTab(null) },
    setChatAlertWords: (chatId: string, words: string[]) => {
      setChatAlertWordsState(prev => {
        const next = { ...prev, [chatId]: words }
        storage.setChatAlertWords(next)
        return next
      })
    },
    setSearchOpen,
    setMembersOpen,
    setContactsOpen,
    setClipboardOpen,
    setStickyOpen,
    setLightboxUrl,
    setForwardMsg,
    setAdhocOpen,
    setShiftChangeOpen,
    setMsgBuilderOpen,
    setOrderSearchOpen,
    saveStickyNote,
    uploadImage,
    setPendingImage,
    showToast,
    removeToast,
    loadMessages,
    loadUnifiedStreams,
    getPanelTitle,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
