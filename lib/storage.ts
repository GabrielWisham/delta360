// Delta 360 - localStorage persistence layer
// All keys are per the spec with gm_v3_ prefix

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function set(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota */ }
}

function getString(key: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback
  return localStorage.getItem(key) ?? fallback
}

function setString(key: string, value: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, value)
}

function remove(key: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

export const storage = {
  // Token
  getToken: () => getString('gm_v3_token'),
  setToken: (v: string) => setString('gm_v3_token', v),
  removeToken: () => remove('gm_v3_token'),

  // Streams
  getStreams: () => get('gm_v3_royal', {}),
  setStreams: (v: unknown) => set('gm_v3_royal', v),

  // Last seen timestamps
  getLastSeen: () => get<Record<string, number>>('gm_v3_lastseen', {}),
  setLastSeen: (v: Record<string, number>) => set('gm_v3_lastseen', v),

  // DM approvals
  getApproved: () => get<Record<string, boolean>>('gm_v3_approved', {}),
  setApproved: (v: Record<string, boolean>) => set('gm_v3_approved', v),

  // Pinned messages
  getPinned: () => get<Record<string, number>>('gm_v3_pinned', {}),
  setPinned: (v: Record<string, number>) => set('gm_v3_pinned', v),

  // Pinned sidebar chats
  getPinnedChats: () => get<Record<string, boolean>>('gm_v3_pinchats', {}),
  setPinnedChats: (v: Record<string, boolean>) => set('gm_v3_pinchats', v),

  // Muted groups
  getMuted: () => get<Record<string, boolean>>('gm_v3_muted', {}),
  setMuted: (v: Record<string, boolean>) => set('gm_v3_muted', v),

  // Sticky notes
  getStickies: () => get<Record<string, { text: string; created: number; exp: number }>>('gm_v3_sticky', {}),
  setStickies: (v: unknown) => set('gm_v3_sticky', v),

  // Sticky history
  getStickyHistory: () => get<Array<{ key: string; text: string; ts: number }>>('gm_v3_stkhist', []),
  setStickyHistory: (v: unknown) => set('gm_v3_stkhist', v),

  // Templates
  getTemplates: () => get<string[]>('gm_v3_tpl', ['Copy that', '10-4', 'En route', 'Need update', 'Standing by']),
  setTemplates: (v: string[]) => set('gm_v3_tpl', v),

  // Alert words
  getAlertWords: () => get<string[]>('gm_v3_alerts', ['urgent', 'help', 'emergency', '@dispatch']),
  setAlertWords: (v: string[]) => set('gm_v3_alerts', v),

  // Theme
  getTheme: () => getString('gm_v3_theme', 'dark') as 'dark' | 'light',
  setTheme: (v: string) => setString('gm_v3_theme', v),

  // Compact mode
  getCompact: () => getString('gm_v3_compact') === '1',
  setCompact: (v: boolean) => setString('gm_v3_compact', v ? '1' : '0'),

  // Layout
  getLayout: () => getString('gm_v3_layout', 'landscape') as 'landscape' | 'portrait',
  setLayout: (v: string) => setString('gm_v3_layout', v),

  // Input at bottom (default true -- standard chat convention)
  getInputBottom: () => { const v = getString('gm_v3_inputbot'); return v === '' ? true : v === '1' },
  setInputBottom: (v: boolean) => setString('gm_v3_inputbot', v ? '1' : '0'),

  // Oldest first (default true -- newest at bottom like standard chat)
  getOldestFirst: () => { const v = getString('gm_v3_oldest'); return v === '' ? true : v === '1' },
  setOldestFirst: (v: boolean) => setString('gm_v3_oldest', v ? '1' : '0'),

  // Sidebar sort
  getSortMode: () => getString('gm_v3_sortmode', 'recent') as 'recent' | 'heat',
  setSortMode: (v: string) => setString('gm_v3_sortmode', v),

  // Status
  getStatus: () => getString('gm_v3_status', 'awy'),
  setStatus: (v: string) => setString('gm_v3_status', v),

  // Feed sound
  getFeedSound: () => getString('gm_v3_feedsnd', 'radar'),
  setFeedSound: (v: string) => setString('gm_v3_feedsnd', v),

  // DM sound
  getDmSound: () => getString('gm_v3_dmsnd', 'chime'),
  setDmSound: (v: string) => setString('gm_v3_dmsnd', v),

  // Feed muted
  getFeedMuted: () => getString('gm_v3_feedmut') === '1',
  setFeedMuted: (v: boolean) => setString('gm_v3_feedmut', v ? '1' : '0'),

  // DM muted
  getDmMuted: () => getString('gm_v3_dmmut') === '1',
  setDmMuted: (v: boolean) => setString('gm_v3_dmmut', v ? '1' : '0'),

  // Unified streams sound
  getUnifiedSound: () => getString('gm_v3_unisnd', 'beacon'),
  setUnifiedSound: (v: string) => setString('gm_v3_unisnd', v),

  // Unified streams muted
  getUnifiedMuted: () => getString('gm_v3_unimut') === '1',
  setUnifiedMuted: (v: boolean) => setString('gm_v3_unimut', v ? '1' : '0'),

  // All notifications
  getAllNotif: () => getString('gm_v3_allnotif') === '1',
  setAllNotif: (v: boolean) => setString('gm_v3_allnotif', v ? '1' : '0'),

  // Clipboard
  getClipboard: () => getString('gm_v3_cb'),
  setClipboard: (v: string) => setString('gm_v3_cb', v),
  getClipboardPos: () => get<{ x: number; y: number }>('gm_v3_cbpos', { x: 100, y: 100 }),
  setClipboardPos: (v: { x: number; y: number }) => set('gm_v3_cbpos', v),

  // Auto-scroll
  getAutoScroll: () => getString('gm_v3_autoscroll', '1') === '1',
  setAutoScroll: (v: boolean) => setString('gm_v3_autoscroll', v ? '1' : '0'),

  // Board gradient colors [r,g,b] for start and end
  getBoardGradient: () => get<{ start: [number, number, number]; end: [number, number, number]; angle: number } | null>('gm_v3_boardgrad', null),
  setBoardGradient: (v: { start: [number, number, number]; end: [number, number, number]; angle: number } | null) => set('gm_v3_boardgrad', v),

  // Global mute
  getGlobalMute: () => getString('gm_v3_gmute') === '1',
  setGlobalMute: (v: boolean) => setString('gm_v3_gmute', v ? '1' : '0'),

  // Sidebar collapsed
  getSidebarCollapsed: () => getString('gm_v3_sbcol') === '1',
  setSidebarCollapsed: (v: boolean) => setString('gm_v3_sbcol', v ? '1' : '0'),

  // Inactive section open
  getInactiveOpen: () => getString('gm_v3_inactive_open') === 'true',
  setInactiveOpen: (v: boolean) => setString('gm_v3_inactive_open', v ? 'true' : 'false'),

  // Local chat renames
  getChatRenames: () => get<Record<string, string>>('gm_v3_renames', {}),
  setChatRenames: (v: Record<string, string>) => set('gm_v3_renames', v),

  // Stream renames
  getStreamRenames: () => get<Record<string, string>>('gm_v3_stream_renames', {}),
  setStreamRenames: (v: Record<string, string>) => set('gm_v3_stream_renames', v),

  // Section order
  getSectionOrder: () => get<string[]>('gm_v3_secorder', ['command', 'streams', 'pending', 'pinned', 'active', 'inactive']),
  setSectionOrder: (v: string[]) => set('gm_v3_secorder', v),

  // Shift change profiles
  getShiftProfiles: () => get<Array<{ name: string; phone: string }>>('gm_v3_shift_profiles', []),
  setShiftProfiles: (v: Array<{ name: string; phone: string }>) => set('gm_v3_shift_profiles', v),

  // Per-chat alert words (keyed by group/dm id)
  getChatAlertWords: () => get<Record<string, string[]>>('gm_v3_chat_alerts', {}),
  setChatAlertWords: (v: Record<string, string[]>) => set('gm_v3_chat_alerts', v),

  // Per-chat alert sounds
  getChatSounds: () => get<Record<string, string>>('gm_v3_chat_sounds', {}),
  setChatSounds: (v: Record<string, string>) => set('gm_v3_chat_sounds', v),
}
