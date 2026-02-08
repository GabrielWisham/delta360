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
  globalMute: boolean
  feedSound: SoundName
  dmSound: SoundName
  feedMuted: boolean
  dmMuted: boolean
  allNotif: boolean
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
  // Pending image
  pendingImage: string | null
  // Search
  searchIndex: GroupMeMessage[]
  // Chat renames
  chatRenames: Record<string, string>
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
  toggleGlobalMute: () => void
  toggleSidebar: () => void
  toggleSidebarMobile: () => void
  setSortMode: (m: 'recent' | 'heat') => void
  setInactiveOpen: (v: boolean) => void
  setFeedSound: (s: SoundName) => void
  setDmSound: (s: SoundName) => void
  setFeedMuted: (v: boolean) => void
  setDmMuted: (v: boolean) => void
  setAllNotif: (v: boolean) => void
  markSeen: (id: string) => void
  isUnread: (id: string, ts: number) => boolean
  approveDM: (uid: string) => void
  blockDM: (uid: string) => void
  togglePinMessage: (mid: string) => void
  togglePinChat: (id: string) => void
  toggleMuteGroup: (gid: string) => void
  setTemplates: (t: string[]) => void
  setAlertWords: (w: string[]) => void
  saveStream: (name: string, ids: string[], sound: SoundName) => void
  deleteStream: (name: string) => void
  toggleStreamMonitor: (name: string) => void
  setMyStatus: (s: UserStatus, broadcast?: boolean) => void
  setConfigOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setMembersOpen: (v: boolean) => void
  setContactsOpen: (v: boolean) => void
  setClipboardOpen: (v: boolean) => void
  setStickyOpen: (v: boolean) => void
  setLightboxUrl: (url: string | null) => void
  setForwardMsg: (msg: StoreState['forwardMsg']) => void
  setAdhocOpen: (v: boolean) => void
  setShiftChangeOpen: (v: boolean) => void
  saveStickyNote: (key: string, text: string, expHours: number) => void
  uploadImage: (file: File) => Promise<string | null>
  setPendingImage: (url: string | null) => void
  showToast: (title: string, body: string, isPriority?: boolean) => void
  loadMessages: (panelIdx: number) => Promise<void>
  getPanelTitle: (type: ViewState['type'], id: string | null) => string
  renameChat: (id: string, name: string) => void
  clearChatRename: (id: string) => void
  getChatDisplayName: (id: string, originalName: string) => string
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
  const [globalMute, setGlobalMute] = useState(false)
  const [feedSound, setFeedSoundState] = useState<SoundName>('radar')
  const [dmSound, setDmSoundState] = useState<SoundName>('chime')
  const [feedMuted, setFeedMutedState] = useState(false)
  const [dmMuted, setDmMutedState] = useState(false)
  const [allNotif, setAllNotifState] = useState(false)
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
  const [configOpen, setConfigOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [clipboardOpen, setClipboardOpen] = useState(false)
  const [stickyOpen, setStickyOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [forwardMsg, setForwardMsg] = useState<StoreState['forwardMsg']>(null)
  const [adhocOpen, setAdhocOpen] = useState(false)
  const [shiftChangeOpen, setShiftChangeOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [searchIndex, setSearchIndex] = useState<GroupMeMessage[]>([])
  const [chatRenames, setChatRenames] = useState<Record<string, string>>({})
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
    setGlobalMute(storage.getGlobalMute())
    setFeedSoundState(storage.getFeedSound() as SoundName)
    setDmSoundState(storage.getDmSound() as SoundName)
    setFeedMutedState(storage.getFeedMuted())
    setDmMutedState(storage.getDmMuted())
    setAllNotifState(storage.getAllNotif())
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
    return '--'
  }, [groups, dmChats])

  const loadMessages = useCallback(async (panelIdx: number) => {
    const view = panelIdx === 0 ? currentView : panels[panelIdx]
    if (!view) return
    const { type, id } = view
    let msgs: GroupMeMessage[] = []
    try {
      if (type === 'group' && id) {
        const data = await api.getGroupMessages(id, 40)
        msgs = data.messages || []
      } else if (type === 'dm' && id) {
        const data = await api.getDMMessages(id, 40)
        msgs = data.direct_messages || []
      } else if (type === 'all') {
        const fetches = groups.slice(0, 10).map(g =>
          api.getGroupMessages(g.id, 5).catch(() => null)
        )
        const approvedDMs = dmChats.filter(d => approved[d.other_user?.id] !== false)
        const dmFetches = approvedDMs.slice(0, 3).map(d =>
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
        const fetches = approvedDMs.slice(0, 12).map(d =>
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
    knownMsgIds.current[panelIdx] = new Set(msgs.map(m => m.id))

    // Index for search
    msgs.forEach(m => {
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
      next[panelIdx] = msgs
      return next
    })
  }, [currentView, panels, groups, dmChats, approved, streams])

  const switchView = useCallback((type: ViewState['type'], id: string | null) => {
    setCurrentView({ type, id })
    if (id) {
      setLastSeen(prev => {
        const next = { ...prev, [id]: Math.floor(Date.now() / 1000) }
        storage.setLastSeen(next)
        return next
      })
    }
    knownMsgIds.current[0] = new Set()
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
      return next
    })
    setStreamToggles(prev => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [])

  const toggleStreamMonitor = useCallback((name: string) => {
    setStreamToggles(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
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
    globalMute,
    feedSound,
    dmSound,
    feedMuted,
    dmMuted,
    allNotif,
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
    searchOpen,
    membersOpen,
    contactsOpen,
    clipboardOpen,
    stickyOpen,
    lightboxUrl,
    forwardMsg,
    adhocOpen,
    shiftChangeOpen,
    pendingImage,
    searchIndex,
    chatRenames,
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
    setFeedMuted: (v: boolean) => { setFeedMutedState(v); storage.setFeedMuted(v) },
    setDmMuted: (v: boolean) => { setDmMutedState(v); storage.setDmMuted(v) },
    setAllNotif: (v: boolean) => { setAllNotifState(v); storage.setAllNotif(v) },
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
    saveStream,
    deleteStream,
    toggleStreamMonitor,
    setMyStatus,
    setConfigOpen,
    setSearchOpen,
    setMembersOpen,
    setContactsOpen,
    setClipboardOpen,
    setStickyOpen,
    setLightboxUrl,
    setForwardMsg,
    setAdhocOpen,
    setShiftChangeOpen,
    saveStickyNote,
    uploadImage,
    setPendingImage,
    showToast,
    removeToast,
    loadMessages,
    getPanelTitle,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
