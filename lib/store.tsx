'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
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
  // Jump behavior on unread
  jumpToUnread: boolean
  // Pending scroll target from toast click
  pendingScrollToMsgId: string | null
  // Bumped by pollLoop when it detects a new message for the current view
  feedRefreshTick: number
  // Message preview toasts
  msgToasts: MsgToast[]
  toastMutedFeeds: Set<string>
}

export type MsgToast = {
  id: number
  sourceKey: string  // e.g. "group:123", "dm:456", "stream:North", "unified_streams"
  sourceName: string
  senderName: string
  text: string
  messageId?: string  // the actual GroupMe message ID to scroll to on click
  viewType: ViewState['type']
  viewId: string | null
  alertWord?: string  // if set, this toast was triggered by an alert word match
  // Navigate to the specific group/DM on click (resolves aggregate feeds)
  originType: 'group' | 'dm'
  originId: string
  ts: number
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
  sendMessageDirect: (targetType: 'group' | 'dm', targetId: string, text: string, attachments?: GroupMeMessage['attachments']) => Promise<void>
  likeMessage: (groupId: string, messageId: string) => Promise<void>
  unlikeMessage: (groupId: string, messageId: string) => Promise<void>
  deleteMessage: (groupId: string, messageId: string) => Promise<void>
  toggleTheme: () => void
  toggleCompact: () => void
  toggleInputBottom: () => void
  toggleOldestFirst: () => void
  setAutoScroll: (v: boolean) => void
  setJumpToUnread: (v: boolean) => void
  setPendingScrollToMsgId: (id: string | null) => void
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
  uploadImage: (file: Blob) => Promise<string | null>
  setPendingImage: (url: string | null) => void
  showToast: (title: string, body: string, isPriority?: boolean) => void
  showMsgToast: (toast: Omit<MsgToast, 'id' | 'ts'>) => void
  testNotification: () => void
  removeMsgToast: (id: number) => void
  toggleToastMuted: (sourceKey: string) => void
  loadMessages: (panelIdx: number, bypassCache?: boolean, isViewSwitch?: boolean) => Promise<void>
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

/** Check message text against global and per-chat alert words (case-insensitive).
 *  Returns the first matched alert word or null. */
  function findAlertWord(text: string, globalWords: string[], chatWords?: string[]): string | null {
  if (!text) return null
  const all = chatWords ? [...globalWords, ...chatWords] : globalWords
  for (const w of all) {
    if (!w) continue
    try {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) return w
    } catch { continue }
  }
  return null
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
  const [inputBottom, setInputBottom] = useState(true)
  const [oldestFirst, setOldestFirst] = useState(true)
  const [autoScroll, setAutoScrollState] = useState(true)
  const [jumpToUnread, setJumpToUnreadState] = useState(true)
  const [pendingScrollToMsgId, setPendingScrollToMsgId] = useState<string | null>(null)
  const [feedRefreshTick, setFeedRefreshTick] = useState(0)
  // Queue of sounds+toasts that fire only AFTER React commits the matching messages
  const [pendingNotifications, setPendingNotifications] = useState<{
    sounds: (() => void)[]
    toasts: Omit<MsgToast, 'id' | 'ts'>[]
  } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [globalMute, setGlobalMute] = useState(false)
  const [feedSound, setFeedSoundState] = useState<SoundName>('chime')
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
  const [msgToasts, setMsgToasts] = useState<MsgToast[]>([])
  const msgToastIdRef = useRef(0)
  const [toastMutedFeeds, setToastMutedFeeds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('d360_toast_muted')
      if (raw) return new Set(JSON.parse(raw))
    } catch { /* empty */ }
    return new Set()
  })
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const knownMsgIds = useRef<Set<string>[]>([new Set(), new Set(), new Set()])
  const panelSeeded = useRef<boolean[]>([false, false, false])
  // Track favorited_by per message to detect new likes on the user's own messages
  const likeTracker = useRef<Record<string, Set<string>>>({})
  const likeTrackerSeeded = useRef(false)
  // Track last_message_id per group/DM for instant notifications from pollLoop
  const lastMsgTracker = useRef<Record<string, string>>({})
  const trackerSeeded = useRef(false)
  // Ref for showMsgToast so pollLoop (defined before the useCallback) can access it
  const showMsgToastRef = useRef<(toast: Omit<MsgToast, 'id' | 'ts'>) => void>(() => {})
  const isLoggingInRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  // Track recently-sent targets so pollLoop skips notifications for own messages.
  // Keyed by tracker key (e.g. "g:123", "d:456"), value is timestamp of last send.
  const recentlySent = useRef<Record<string, number>>({})

  // Load persisted settings on mount
  useEffect(() => {
    setTheme(storage.getTheme())
    setCompact(storage.getCompact())
    setInputBottom(storage.getInputBottom())
    setOldestFirst(storage.getOldestFirst())
  setAutoScrollState(storage.getAutoScroll())
  setJumpToUnreadState(storage.getJumpToUnread())
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
    const savedStreams = storage.getStreams() as StreamsMap
    setStreams(savedStreams)
    // All streams toggled on by default so the unified feed shows everything
    setStreamToggles(new Set(Object.keys(savedStreams)))
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
      userIdRef.current = me.id
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
      userIdRef.current = me.id
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
  // Clear ALL persisted state for a clean newbie experience on next login
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && (k.startsWith('gm_v3_') || k.startsWith('d360_'))) keysToRemove.push(k)
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
  // Reset in-memory state
  setIsLoggedIn(false)
  setUser(null)
  userIdRef.current = null
  setGroups([])
  setDmChats([])
  setPanelMessages([[], [], []])
  setCurrentView({ type: 'all', id: null })
  trackerSeeded.current = false
  Object.keys(lastMsgTracker.current).forEach(k => delete lastMsgTracker.current[k])
  likeTrackerSeeded.current = false
  likeTracker.current = {}
  panelSeeded.current = [false, false, false]
  knownMsgIds.current = [new Set(), new Set(), new Set()]
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

      // Prune expired entries from recentlySent (>15s old)
      const now = Date.now()
      for (const k of Object.keys(recentlySent.current)) {
        if (now - recentlySent.current[k] > 15_000) delete recentlySent.current[k]
      }

      // --- Instant notification detection from group/DM list metadata ---
      if (trackerSeeded.current) {
        const cv = currentViewRef.current
        let needsFeedRefresh = false
        let needsUnifiedRefresh = false
        const changedGroupIds: string[] = []
        // Queue toasts, sounds, and notifications so they fire AFTER the feed refreshes
        const pendingToasts: Omit<MsgToast, 'id' | 'ts'>[] = []
        const pendingSounds: (() => void)[] = []
        // Check groups for new messages
        for (const group of g) {
          const lmid = group.messages?.last_message_id
          if (!lmid) continue
          const prevId = lastMsgTracker.current[`g:${group.id}`]
          if (prevId && prevId !== lmid) {
            if (cv.type === 'all' || (cv.type === 'group' && cv.id === group.id) || cv.type === 'stream') {
              needsFeedRefresh = true
            }
            if (cv.type === 'unified_streams') {
              needsUnifiedRefresh = true
              changedGroupIds.push(group.id)
            }
            if (group.messages?.preview) {
              const prev = group.messages.preview
              // sender_id is optional in the preview -- fall back to recentlySent
              // tracker to suppress notifications for the user's own messages.
              const sentTs = recentlySent.current[`g:${group.id}`] ?? recentlySent.current['__any__']
              const isSelf = prev.sender_id === userIdRef.current
                || (sentTs != null && Date.now() - sentTs < 12_000)
              // Suppress notifications if the user is already viewing this group
              const isViewingThis = cv.type === 'group' && cv.id === group.id
              const senderName = prev.nickname || 'Someone'
              const text = prev.text || (prev.image_attached ? '(image)' : '(attachment)')
              // Check alert words (global + per-chat)
              const matchedAlert = findAlertWord(text, alertWordsRef.current, chatAlertWordsRef.current[group.id])
              if (matchedAlert && !isSelf && !globalMuteRef.current) {
                // Alert word match gets highest priority -- siren sound, overrides
                // mute and "viewing this" suppression.
                const notifTitle = `ALERT: "${matchedAlert}" - ${group.name}`
                const notifBody = `${senderName}: ${text}`
                pendingSounds.push(() => { playSound('siren' as SoundName); sendDesktopNotification(notifTitle, notifBody) })
              } else if (!isSelf && !isViewingThis) {
                // Collect sounds from all TOGGLED streams that contain this group.
                // Each toggled stream plays its own sound independently.
                const matchedStreamSounds: SoundName[] = []
                for (const [key, s] of Object.entries(streamsRef.current)) {
                  if (s.ids.includes(group.id) && streamTogglesRef.current.has(key)) {
                    matchedStreamSounds.push((s.sound as SoundName) || feedSoundRef.current)
                  }
                }

                if (matchedStreamSounds.length > 0) {
                  // Toggled streams override global/feed mute -- the user
                  // explicitly enabled these streams for monitoring.
                  // Play each stream's sound but only send one desktop notification.
                  const notifTitle = `Delta 360 - ${group.name}`
                  const notifBody = `${senderName}: ${text}`
                  matchedStreamSounds.forEach((sound, i) => {
                    pendingSounds.push(() => {
                      // Stagger sounds slightly so they don't overlap into noise
                      setTimeout(() => playSound(sound), i * 300)
                      if (i === 0) sendDesktopNotification(notifTitle, notifBody)
                    })
                  })
                } else if (!globalMuteRef.current && !feedMutedRef.current) {
                  // No toggled stream matched -- fall back to default feed sound
                  // (respects global/feed mute as before).
                  const soundToPlay = feedSoundRef.current
                  const notifTitle = `Delta 360 - ${group.name}`
                  const notifBody = `${senderName}: ${text}`
                  pendingSounds.push(() => { playSound(soundToPlay); sendDesktopNotification(notifTitle, notifBody) })
                }
              }
              if (!isSelf && !isViewingThis) {
                pendingToasts.push({ sourceKey: `group:${group.id}`, sourceName: group.name, senderName, text, messageId: lmid, viewType: 'group', viewId: group.id, originType: 'group', originId: group.id, ...(matchedAlert ? { alertWord: matchedAlert } : {}) })
              } else if (matchedAlert && !isSelf) {
                pendingToasts.push({ sourceKey: `group:${group.id}`, sourceName: group.name, senderName, text, messageId: lmid, viewType: 'group', viewId: group.id, originType: 'group', originId: group.id, alertWord: matchedAlert })
              }
            }
          }
          lastMsgTracker.current[`g:${group.id}`] = lmid
        }
        // Check DMs for new messages
        const approvedNow = approvedRef.current
        for (const dm of d) {
          const lm = dm.last_message
          if (!lm) continue
          const otherId = dm.other_user?.id || ''
          if (approvedNow[otherId] === false) continue
          const lmid = lm.id || `${lm.created_at}`
          const prevId = lastMsgTracker.current[`d:${otherId}`]
          if (prevId && prevId !== lmid) {
            if (cv.type === 'dms' || (cv.type === 'dm' && cv.id === otherId)) {
              needsFeedRefresh = true
            }
            if (cv.type === 'unified_streams') {
              needsUnifiedRefresh = true
            }
            const sentDmTs = recentlySent.current[`d:${otherId}`] ?? recentlySent.current['__any__']
            const isSelf = (lm.sender_id || lm.user_id) === userIdRef.current
              || (sentDmTs != null && Date.now() - sentDmTs < 12_000)
            // Suppress notifications if the user is already viewing this DM
            const isViewingThis = cv.type === 'dm' && cv.id === otherId
            const senderName = lm.name || dm.other_user?.name || 'DM'
            const text = lm.text || '(attachment)'
            // Check alert words (global + per-chat). DM chat alert key is
            // just otherId (matching the view.id used in the config UI).
            const matchedAlert = findAlertWord(text, alertWordsRef.current, chatAlertWordsRef.current[otherId])
            if (matchedAlert && !isSelf && !globalMuteRef.current) {
              // Alert word match gets highest priority -- siren sound, overrides
              // mute and "viewing this" suppression.
              const notifTitle = `ALERT: "${matchedAlert}" - DM`
              const notifBody = `${senderName}: ${text}`
              pendingSounds.push(() => { playSound('siren' as SoundName); sendDesktopNotification(notifTitle, notifBody) })
            } else if (!isSelf && !isViewingThis && !globalMuteRef.current && !dmMutedRef.current) {
              const soundToPlay = dmSoundRef.current
              const notifTitle = 'Delta 360 - DM'
              const notifBody = `${senderName}: ${text}`
              pendingSounds.push(() => { playSound(soundToPlay); sendDesktopNotification(notifTitle, notifBody) })
            }
            if (!isSelf && !isViewingThis) {
              pendingToasts.push({ sourceKey: `dm:${otherId}`, sourceName: dm.other_user?.name || 'DM', senderName, text, messageId: lmid, viewType: 'dm', viewId: otherId, originType: 'dm', originId: otherId, ...(matchedAlert ? { alertWord: matchedAlert } : {}) })
            } else if (matchedAlert && !isSelf) {
              pendingToasts.push({ sourceKey: `dm:${otherId}`, sourceName: dm.other_user?.name || 'DM', senderName, text, messageId: lmid, viewType: 'dm', viewId: otherId, originType: 'dm', originId: otherId, alertWord: matchedAlert })
            }
          }
          lastMsgTracker.current[`d:${otherId}`] = lmid
        }
        // Pass the notification payload INTO the refresh functions so that
        // setPanelMessages + setPendingNotifications happen in the same synchronous
        // block. React batches state updates within a single synchronous call,
        // guaranteeing messages and notifications commit in the SAME render.
        const notifPayload = (pendingSounds.length > 0 || pendingToasts.length > 0)
          ? { sounds: pendingSounds, toasts: pendingToasts } : null

        // Refresh feeds FIRST so messages appear, THEN fire notifications.
        // This prevents the user from seeing a new message in the feed before
        // the toast has appeared.
        const refreshPromises: Promise<void>[] = []
        if (needsFeedRefresh) { refreshPromises.push(loadMessagesRef.current(0)) }
        if (needsUnifiedRefresh && !unifiedLoadingRef.current) {
          refreshPromises.push(
            changedGroupIds.length > 0
              ? patchUnifiedRef.current(changedGroupIds)
              : refreshUnifiedRef.current()
          )
        }
        if (refreshPromises.length > 0) {
          await Promise.all(refreshPromises)
          setFeedRefreshTick(t => t + 1)
        }
        // Fire notifications AFTER feed is updated so toast and message appear together
        if (notifPayload) {
          setPendingNotifications(notifPayload)
        }
      } else {
        // First poll -- seed the tracker without firing notifications
        for (const group of g) {
          const lmid = group.messages?.last_message_id
          if (lmid) lastMsgTracker.current[`g:${group.id}`] = lmid
        }
        for (const dm of d) {
          const lm = dm.last_message
          const otherId = dm.other_user?.id || ''
          if (lm) lastMsgTracker.current[`d:${otherId}`] = lm.id || `${lm.created_at}`
        }
        trackerSeeded.current = true
        // Silently refresh the active feed to catch any messages that arrived
        // between the initial load and this first poll cycle.
        const cv = currentViewRef.current
        if (cv.type === 'unified_streams' && !unifiedLoadingRef.current) {
          refreshUnifiedRef.current()
        } else if (cv.type === 'all' || cv.type === 'group' || cv.type === 'dm' || cv.type === 'dms' || cv.type === 'stream') {
          loadMessagesRef.current(0)
        }
      }

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

  // Use refs for notification settings to avoid stale closures in pollLoop/loadMessages
  const toastMutedRef = useRef(toastMutedFeeds)
  toastMutedRef.current = toastMutedFeeds
  const globalMuteRef = useRef(globalMute)
  globalMuteRef.current = globalMute
  const feedMutedRef = useRef(feedMuted)
  feedMutedRef.current = feedMuted
  const dmMutedRef = useRef(dmMuted)
  dmMutedRef.current = dmMuted
  const feedSoundRef = useRef(feedSound)
  feedSoundRef.current = feedSound
  const dmSoundRef = useRef(dmSound)
  dmSoundRef.current = dmSound
  const approvedRef = useRef(approved)
  approvedRef.current = approved
  const streamsRef = useRef(streams)
  streamsRef.current = streams
  const streamTogglesRef = useRef(streamToggles)
  streamTogglesRef.current = streamToggles
  const currentViewRef = useRef(currentView)
  currentViewRef.current = currentView
  const alertWordsRef = useRef(alertWords)
  alertWordsRef.current = alertWords
  const chatAlertWordsRef = useRef(chatAlertWords)
  chatAlertWordsRef.current = chatAlertWords

  const showMsgToast = useCallback((toast: Omit<MsgToast, 'id' | 'ts'>) => {
    if (toastMutedRef.current.has(toast.sourceKey)) return
    const id = ++msgToastIdRef.current
    const entry: MsgToast = { ...toast, id, ts: Date.now() }
    setMsgToasts(prev => [...prev.slice(-6), entry])
    setTimeout(() => {
      setMsgToasts(prev => prev.filter(t => t.id !== id))
    }, 10000)
  }, [])
  showMsgToastRef.current = showMsgToast

  // Drain pending notifications synchronously after React mutates the DOM but
  // BEFORE the browser paints. This makes the message appearance and the toast
  // arrive in the exact same visual frame -- no perceptible gap.
  useLayoutEffect(() => {
    if (!pendingNotifications) return
    for (const fn of pendingNotifications.sounds) fn()
    for (const t of pendingNotifications.toasts) showMsgToast(t)
    setPendingNotifications(null)
  }, [pendingNotifications, showMsgToast])
  
  const removeMsgToast = useCallback((id: number) => {
    setMsgToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toggleToastMuted = useCallback((sourceKey: string) => {
    setToastMutedFeeds(prev => {
      const next = new Set(prev)
      if (next.has(sourceKey)) next.delete(sourceKey)
      else next.add(sourceKey)
      localStorage.setItem('d360_toast_muted', JSON.stringify([...next]))
      return next
    })
  }, [])

  const getPanelTitle = useCallback((type: ViewState['type'], id: string | null) => {
    if (type === 'all') return 'Universal Feed'
    if (type === 'dms') return 'Direct Comms'
    if (type === 'group') return groups.find(g => g.id === id)?.name || 'Group'
    if (type === 'dm') {
      const dm = dmChats.find(d => d.other_user?.id === id)
      if (dm?.other_user?.name) return dm.other_user.name
      // Fallback: look up user from group member lists
      for (const g of groups) {
        const member = g.members?.find((m: { user_id: string; nickname: string }) => m.user_id === id)
        if (member?.nickname) return member.nickname
      }
      return 'DM'
    }
    if (type === 'stream') return id || 'Stream'
    if (type === 'unified_streams') return 'Unified Streams'
    return '--'
  }, [groups, dmChats])

  // Message cache: keyed by "type:id" to avoid refetching when switching back
  const msgCache = useRef<Record<string, { msgs: GroupMeMessage[]; ts: number }>>({})
  const CACHE_TTL = 10_000 // 10s -- show cached instantly, refresh in background
  // After sending, suppress loadMessages for a few seconds so the optimistic
  // message stays on-screen undisturbed. The poll, feedRefreshTick effect,
  // and interval all call loadMessages and would otherwise cause flashes.
  const suppressRefreshUntilRef = useRef(0)

  const loadMessages = useCallback(async (panelIdx: number, bypassCache?: boolean, isViewSwitch?: boolean) => {
    // After sending, suppress poll-driven refreshes but allow explicit view switches
    if (!isViewSwitch && Date.now() < suppressRefreshUntilRef.current) return
    const view = panelIdx === 0 ? currentView : panels[panelIdx]
    if (!view) return
    const { type, id } = view
    if (type === 'unified_streams') { refreshUnifiedRef.current(); return }

    const cacheKey = `${type}:${id || '_'}`
    const cached = msgCache.current[cacheKey]
    // For poll-driven refreshes (not view switches), use cache to avoid
    // unnecessary fetches and re-renders.
    if (!isViewSwitch && cached && cached.msgs.length > 0) {
      const isFresh = Date.now() - cached.ts < CACHE_TTL
      if (isFresh && !bypassCache) {
        setPanelMessages(prev => {
          const next = [...prev]
          next[panelIdx] = cached.msgs
          return next
        })
        return
      }
    }
    // View switches always fetch fresh data (no stale cache display).

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

    // Update known IDs (notifications now handled by pollLoop for instant sync)
    knownMsgIds.current[panelIdx] = new Set(msgs.map(m => m.id))
    panelSeeded.current[panelIdx] = true

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

    // Detect new likes (hearts/thumbs up) on the current user's own messages
    if (user && panelIdx === 0) {
      const myId = user.id
      if (!likeTrackerSeeded.current) {
        // First load: seed the tracker without firing notifications
        for (const m of msgs) {
          likeTracker.current[m.id] = new Set(m.favorited_by || [])
        }
        likeTrackerSeeded.current = true
      } else {
        for (const m of msgs) {
          if ((m.user_id || m.sender_id) !== myId) continue // only track user's own messages
          const prev = likeTracker.current[m.id]
          const curr = m.favorited_by || []
          if (prev) {
            const newLikers = curr.filter(uid => !prev.has(uid))
            if (newLikers.length > 0 && !globalMuteRef.current) {
              // Resolve liker name from group members
              let likerName = 'Someone'
              for (const g of groups) {
                const member = g.members?.find((mem: { user_id: string; nickname: string }) => mem.user_id === newLikers[0])
                if (member?.nickname) { likerName = member.nickname; break }
              }
              const suffix = newLikers.length > 1 ? ` and ${newLikers.length - 1} other${newLikers.length > 2 ? 's' : ''}` : ''
              const msgPreview = m.text ? (m.text.length > 30 ? m.text.slice(0, 30) + '...' : m.text) : '(attachment)'
              playSound('drop')
              sendDesktopNotification('Delta 360 - New Like', `${likerName}${suffix} liked: "${msgPreview}"`)
            }
          }
          likeTracker.current[m.id] = new Set(curr)
        }
        // Prune old entries to avoid memory bloat (keep only current message IDs)
        const currentIds = new Set(msgs.map(m => m.id))
        for (const id of Object.keys(likeTracker.current)) {
          if (!currentIds.has(id)) delete likeTracker.current[id]
        }
      }
    }

    // Only update panelMessages when something visible actually changed.
    setPanelMessages(prev => {
      const existing = prev[panelIdx] || []

      // Shallow-compare by ID + text + likes -- if identical, skip re-render.
      if (
        existing.length === msgs.length &&
        existing.every((m, i) => {
          const s = msgs[i]
          return m.id === s.id
            && m.text === s.text
            && (m.favorited_by?.length || 0) === (s.favorited_by?.length || 0)
            && m._deleted === s._deleted
        })
      ) {
        return prev
      }

      // Preserve pending optimistic messages if the server hasn't caught up yet
      const optimistic = existing.filter(
        m => typeof m.id === 'string' && m.id.startsWith('optimistic-')
      )
      if (optimistic.length > 0) {
        const serverIds = new Set(msgs.map(m => m.id))
        const now = Math.floor(Date.now() / 1000)
        const pending = optimistic.filter(o =>
          !serverIds.has(o.id) && (now - o.created_at) < 10
          // Also check if a server msg has the same text (real version arrived)
          && !msgs.some(s => s.text === o.text && Math.abs(s.created_at - o.created_at) < 15)
        )
        if (pending.length > 0) {
          const merged = [...msgs, ...pending]
          merged.sort((a, b) => a.created_at - b.created_at)
          const next = [...prev]
          next[panelIdx] = merged
          return next
        }
      }

      const next = [...prev]
      next[panelIdx] = msgs
      return next
    })
  }, [currentView, panels, groups, dmChats, approved, streams, user])

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
  // streamsRef / streamTogglesRef already defined earlier (notification refs section) -- just keep in sync
  streamsRef.current = streams
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

  // Silent refresh: no spinner, atomically swaps messages in place.
  // Accepts optional notification payload to commit in the SAME synchronous
  // block as setPanelMessages, guaranteeing React batches them into one render.
  const refreshUnifiedStreams = useCallback(async () => {
    const version = ++unifiedVersion.current
    const ready = await fetchUnifiedMessages(version)
    if (ready === null || version !== unifiedVersion.current) return
    for (const m of ready) unifiedKnownIds.current.add(m.id)
    // Detect new likes on the user's own messages in unified feed
    if (user && likeTrackerSeeded.current) {
      const myId = user.id
      for (const m of ready) {
        if ((m.user_id || m.sender_id) !== myId) continue
        const prev = likeTracker.current[m.id]
        const curr = m.favorited_by || []
        if (prev) {
          const newLikers = curr.filter(uid => !prev.has(uid))
          if (newLikers.length > 0 && !globalMuteRef.current) {
            let likerName = 'Someone'
            for (const g of groups) {
              const member = g.members?.find((mem: { user_id: string; nickname: string }) => mem.user_id === newLikers[0])
              if (member?.nickname) { likerName = member.nickname; break }
            }
            const suffix = newLikers.length > 1 ? ` and ${newLikers.length - 1} other${newLikers.length > 2 ? 's' : ''}` : ''
            const msgPreview = m.text ? (m.text.length > 30 ? m.text.slice(0, 30) + '...' : m.text) : '(attachment)'
            playSound('drop')
            sendDesktopNotification('Delta 360 - New Like', `${likerName}${suffix} liked: "${msgPreview}"`)
          }
        }
        likeTracker.current[m.id] = new Set(curr)
      }
    }
    // Merge instead of replace so concurrent patches aren't lost.
    // Start from the full fresh fetch, then add any extra messages that
    // exist in current state but aren't in the fresh fetch (e.g. from a
    // concurrent patchUnifiedStreams that committed after our fetch started).
    setPanelMessages(prev => {
      const freshIds = new Set(ready.map(m => m.id))
      const existing = prev[0] || []
      const extras = existing.filter(m => !freshIds.has(m.id))
      let merged = [...ready, ...extras]
      merged.sort((a, b) => a.created_at - b.created_at)
      if (merged.length > 60) merged = merged.slice(merged.length - 60)
      const n = [...prev]
      n[0] = merged
      return n
    })
  }, [fetchUnifiedMessages, user, groups])
  // Targeted patch: only fetch from specific groups and merge into existing
  // unified messages. Much faster than a full refresh (~200ms vs 2-4s).
  const patchUnifiedStreams = useCallback(async (groupIds: string[]) => {
    if (groupIds.length === 0) return
    // Invalidate any in-flight full refreshes so they don't overwrite our patch
    ++unifiedVersion.current
    try {
      const fetches = groupIds.map(gid => api.getGroupMessages(gid, 8).catch(() => null))
      const results = await Promise.all(fetches)
      const newMsgs: GroupMeMessage[] = []
      results.forEach(r => {
        if (r && 'messages' in r) newMsgs.push(...(r.messages || []))
      })
      if (newMsgs.length === 0) return
      // Merge new messages into existing panelMessages[0]
      setPanelMessages(prev => {
        const existing = prev[0] || []
        const merged = [...existing]
        const existingIds = new Set(existing.map(m => m.id))
        for (const m of newMsgs) {
          if (!existingIds.has(m.id)) {
            merged.push(m)
            existingIds.add(m.id)
          } else {
            // Update existing message (e.g. new likes)
            const idx = merged.findIndex(em => em.id === m.id)
            if (idx !== -1) merged[idx] = m
          }
        }
        // Sort ascending by created_at, keep 60 most recent
        merged.sort((a, b) => a.created_at - b.created_at)
        const trimmed = merged.length > 60 ? merged.slice(merged.length - 60) : merged
        const next = [...prev]
        next[0] = trimmed
        return next
      })
      // Update known IDs
      for (const m of newMsgs) unifiedKnownIds.current.add(m.id)
    } catch { /* ignore */ }
  }, [])
  const patchUnifiedRef = useRef(patchUnifiedStreams)
  patchUnifiedRef.current = patchUnifiedStreams
  const refreshUnifiedRef = useRef(refreshUnifiedStreams)
  refreshUnifiedRef.current = refreshUnifiedStreams
  const loadMessagesRef = useRef(loadMessages)
  loadMessagesRef.current = loadMessages

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
    panelSeeded.current[0] = cached ? true : false

    // Clear the post-send suppression so loadMessages isn't blocked after
    // a view switch (e.g. clicking a toast right after sending).
    suppressRefreshUntilRef.current = 0

    // Always clear messages on view switch so the spinner shows while we
    // fetch fresh data. This prevents stale cached messages from flashing
    // before the latest messages arrive.
    setPanelMessages(prev => {
      const next = [...prev]
      next[0] = []
      return next
    })

    setSidebarMobileOpen(false)
  }, [])

  const openSecondaryPanel = useCallback((type: ViewState['type'], id: string | null) => {
    setPanels(prev => {
      const next = [...prev]
      const slot = !next[1] ? 1 : !next[2] ? 2 : 1
      next[slot] = { type, id }
      knownMsgIds.current[slot] = new Set()

      // Clear messages so spinner shows while fetching fresh data
      setPanelMessages(pm => {
        const pmNext = [...pm]
        pmNext[slot] = []
        return pmNext
      })

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
    // Suppress all loadMessages calls for 5s so the optimistic message
    // stays on-screen without flashing from poll/tick/interval refetches.
    suppressRefreshUntilRef.current = Date.now() + 5000
    // Mark this target so pollLoop skips notifications for our own message.
    // For direct group/dm views the key is straightforward. For aggregate views
    // (all, stream, unified_streams, dms) the actual API target is still a
    // group or DM, so we derive the key from the view's underlying id.
    if (id) {
      if (type === 'group') {
        recentlySent.current[`g:${id}`] = Date.now()
      } else if (type === 'dm') {
        recentlySent.current[`d:${id}`] = Date.now()
      } else {
        // Aggregate view -- we can't know which specific group/DM the message
        // will land in (sendMessage doesn't have that info in aggregate mode).
        // Set a blanket flag so the poll loop skips ALL self-notifications
        // for the next 12s.
        recentlySent.current['__any__'] = Date.now()
      }
    }
    // Optimistic insert so the message appears instantly
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (user && id) {
      const optimisticMsg: GroupMeMessage = {
        id: optimisticId,
        source_guid: optimisticId,
        created_at: Math.floor(Date.now() / 1000),
        user_id: user.id,
        sender_id: user.id,
        group_id: type === 'group' ? id : undefined,
        recipient_id: type === 'dm' ? id : undefined,
        name: user.name,
        avatar_url: user.avatar_url,
        text,
        system: false,
        favorited_by: [],
        attachments: attachments || [],
      }
      setPanelMessages(prev => {
        const next = [...prev]
        const msgs = [...(next[panelIdx] || [])]
        if (oldestFirst) { msgs.push(optimisticMsg) } else { msgs.unshift(optimisticMsg) }
        next[panelIdx] = msgs
        return next
      })
      // Do NOT bump feedRefreshTick here -- the optimistic message is already
      // shown and the deferred loadMessages (600ms) will reconcile with the
      // server. Bumping the tick triggers an immediate fetch that races with
      // the deferred one, causing duplicate renders and scroll jumps.
    }
    try {
      if (type === 'group' && id) {
        await api.sendGroupMessage(id, text, attachments)
      } else if (type === 'dm' && id) {
        await api.sendDM(id, text, attachments)
      }
      setPendingImage(null)
      // No eager refetch -- the optimistic message is already displayed and
      // the regular poll cycle (~4s) will reconcile with the server, swapping
      // out the optimistic ID for the real one. Eager refetches cause a full
      // array replace that visually "reloads" every message card.
    } catch {
      // Remove optimistic message on failure
      setPanelMessages(prev => {
        const next = [...prev]
        next[panelIdx] = (next[panelIdx] || []).filter(m => m.id !== optimisticId)
        return next
      })
      showToast('Error', 'Failed to send message')
    }
  }, [currentView, panels, showToast, user, oldestFirst])

  // Send a message directly to a specific group/DM (used when replying from aggregate views)
  const sendMessageDirect = useCallback(async (targetType: 'group' | 'dm', targetId: string, text: string, attachments: GroupMeMessage['attachments'] = []) => {
    // Suppress all loadMessages calls for 5s so the optimistic message stays stable
    suppressRefreshUntilRef.current = Date.now() + 5000
    // Mark this target so pollLoop skips notifications for our own message
    const trackerKey = targetType === 'group' ? `g:${targetId}` : `d:${targetId}`
    recentlySent.current[trackerKey] = Date.now()
    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (user) {
      const optimisticMsg: GroupMeMessage = {
        id: optimisticId,
        source_guid: optimisticId,
        created_at: Math.floor(Date.now() / 1000),
        user_id: user.id,
        sender_id: user.id,
        group_id: targetType === 'group' ? targetId : undefined,
        recipient_id: targetType === 'dm' ? targetId : undefined,
        name: user.name,
        avatar_url: user.avatar_url,
        text,
        system: false,
        favorited_by: [],
        attachments: attachments || [],
      }
      setPanelMessages(prev => {
        const next = [...prev]
        const msgs = [...(next[0] || [])]
        if (oldestFirst) { msgs.push(optimisticMsg) } else { msgs.unshift(optimisticMsg) }
        next[0] = msgs
        return next
      })
      // Don't bump feedRefreshTick -- deferred loadMessages handles reconciliation
    }
    try {
      if (targetType === 'group') {
        await api.sendGroupMessage(targetId, text, attachments)
      } else {
        await api.sendDM(targetId, text, attachments)
      }
      setPendingImage(null)
      // No eager refetch -- poll cycle reconciles naturally
    } catch {
      setPanelMessages(prev => {
        const next = [...prev]
        next[0] = (next[0] || []).filter(m => m.id !== optimisticId)
        return next
      })
      showToast('Error', 'Failed to send message')
    }
  }, [showToast, user, oldestFirst])

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
    // Automatically toggle new streams on so they appear in the unified feed
    setStreamToggles(prev => {
      const next = new Set(prev)
      next.add(name)
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
      const next: StreamsMap = {}
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

  const uploadImage = useCallback(async (file: Blob) => {
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
  jumpToUnread,
  pendingScrollToMsgId,
  feedRefreshTick,
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
    msgToasts,
    toastMutedFeeds,
    // Actions
    login,
    logout,
    switchView,
    openSecondaryPanel,
    closePanel,
    setActivePanel: setActivePanelIdx,
    refreshData,
    sendMessage,
    sendMessageDirect,
    likeMessage: async (gid: string, mid: string) => { try { await api.likeMessage(gid, mid) } catch {} },
    unlikeMessage: async (gid: string, mid: string) => { try { await api.unlikeMessage(gid, mid) } catch {} },
    deleteMessage: async (gid: string, mid: string) => {
      try {
        await api.deleteMessage(gid, mid)
        // Optimistically replace the message with a deleted placeholder
        setPanelMessages(prev => prev.map(panel =>
          panel.map(m => m.id === mid
            ? { ...m, text: 'This message has been deleted.', attachments: [], _deleted: true } as typeof m
            : m
          )
        ))
        setPendingScrollToMsgId(mid)
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
  setJumpToUnread: (v: boolean) => { setJumpToUnreadState(v); storage.setJumpToUnread(v) },
  setPendingScrollToMsgId,
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
    showMsgToast,
    testNotification: () => {
      playSound(feedSound)
      showMsgToast({ sourceKey: 'test', sourceName: 'Test Group', senderName: 'Test User', text: 'This is a test notification -- if you see this toast AND hear a sound, notifications work!', viewType: 'group', viewId: '', originType: 'group', originId: '' })
    },
    removeMsgToast,
    toggleToastMuted,
    loadMessages,
    loadUnifiedStreams,
    getPanelTitle,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
