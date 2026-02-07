// Delta 360 - Core Types

export interface GroupMeUser {
  id: string
  name: string
  avatar_url: string | null
  email?: string
  phone_number?: string
}

export interface GroupMeMember {
  user_id: string
  nickname: string
  image_url: string | null
  id: string
  muted: boolean
  autokicked: boolean
  roles: string[]
}

export interface GroupMeGroup {
  id: string
  name: string
  description: string
  image_url: string | null
  creator_user_id: string
  created_at: number
  updated_at: number
  members: GroupMeMember[]
  messages: {
    count: number
    last_message_id: string
    last_message_created_at: number
    preview: { nickname: string; text: string; image_attached: boolean }
  }
}

export interface GroupMeDMChat {
  created_at: number
  updated_at: number
  last_message: {
    attachments: GroupMeAttachment[]
    avatar_url: string | null
    conversation_id: string
    created_at: number
    favorited_by: string[]
    id: string
    name: string
    recipient_id: string
    sender_id: string
    sender_type: string
    source_guid: string
    text: string
    user_id: string
  }
  messages_count: number
  other_user: {
    avatar_url: string | null
    id: string
    name: string
  }
}

export interface GroupMeAttachment {
  type: string
  url?: string
  reply_id?: string
  base_reply_id?: string
  user_id?: string
  loci?: number[][]
  placeholder?: string
  charmap?: number[][]
}

export interface GroupMeMessage {
  id: string
  source_guid: string
  created_at: number
  user_id: string
  sender_id?: string
  recipient_id?: string
  group_id?: string
  name: string
  avatar_url: string | null
  text: string | null
  system: boolean
  favorited_by: string[]
  attachments: GroupMeAttachment[]
  sender_type?: string
  platform?: string
}

export type ViewType = 'all' | 'dms' | 'group' | 'dm' | 'stream'

export interface ViewState {
  type: ViewType
  id: string | null
}

export interface CustomStream {
  ids: string[]
  sound: SoundName
}

export type StreamsMap = Record<string, CustomStream>

export type SoundName = 'radar' | 'chime' | 'click' | 'alert' | 'sonar' | 'drop'
export const SOUND_NAMES: SoundName[] = ['radar', 'chime', 'click', 'alert', 'sonar', 'drop']

export type UserStatus = 'avl' | 'bsy' | 'awy'

export interface TeamMemberStatus {
  name: string
  status: UserStatus
  userId?: string
  timestamp?: number
}

export interface StickyNote {
  text: string
  created: number
  exp: number
}

export interface StickyHistoryEntry {
  key: string
  text: string
  ts: number
}

export interface PanelState {
  type: ViewType
  id: string | null
}

export const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🔥', '💯', '👏', '🎉', '💪', '👀',
  '🤔', '✅', '❌', '⭐', '💀', '🙏',
  '😎', '🤙', '👊', '💬', '📌', '🚀',
]

export const DEFAULT_TEMPLATES = ['Copy that', '10-4', 'En route', 'Need update', 'Standing by']
export const DEFAULT_ALERT_WORDS = ['urgent', 'help', 'emergency', '@dispatch']
