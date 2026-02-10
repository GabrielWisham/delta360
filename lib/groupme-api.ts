// Delta 360 - GroupMe API Client (proxied through /api/groupme to avoid CORS + rate limits)

import type {
  GroupMeUser,
  GroupMeGroup,
  GroupMeDMChat,
  GroupMeMessage,
} from './types'

// All requests go through our server-side proxy
const PROXY_BASE = '/api/groupme'

class GroupMeAPI {
  private token = ''

  // Client-side request queue to limit concurrency and avoid 429s
  private queue: (() => void)[] = []
  private active = 0
  private maxConcurrent = 2 // max simultaneous requests
  private lastDequeue = 0
  private minGap = 150 // ms between request starts

  setToken(token: string) {
    this.token = token
  }

  getToken() {
    return this.token
  }

  private async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    // Wait for a slot
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>(resolve => this.queue.push(resolve))
    }
    // Enforce minimum gap between request starts
    const now = Date.now()
    const wait = Math.max(0, this.minGap - (now - this.lastDequeue))
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    this.lastDequeue = Date.now()
    this.active++
    try {
      return await fn()
    } finally {
      this.active--
      const next = this.queue.shift()
      if (next) next()
    }
  }

  private async request<T>(
    endpoint: string,
    opts: RequestInit = {}
  ): Promise<T> {
    if (!this.token) throw new Error('No token set')
    return this.enqueue(async () => {
      // Strip leading slash, proxy expects path segments
      const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
      const sep = path.includes('?') ? '&' : '?'
      const url = `${PROXY_BASE}/${path}${sep}token=${this.token}`
      const res = await fetch(url, opts)
      if (res.status === 401) throw new Error('Unauthorized')
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      return data.response as T
    })
  }

  async getMe(): Promise<GroupMeUser> {
    return this.request<GroupMeUser>('/users/me')
  }

  async getGroups(): Promise<GroupMeGroup[]> {
    return this.request<GroupMeGroup[]>('/groups?per_page=100')
  }

  async getDMChats(): Promise<GroupMeDMChat[]> {
    return this.request<GroupMeDMChat[]>('/chats?per_page=50')
  }

  async getGroupMessages(
    groupId: string,
    limit = 40,
    beforeId?: string
  ): Promise<{ messages: GroupMeMessage[] }> {
    const params = `/groups/${groupId}/messages?limit=${limit}${beforeId ? `&before_id=${beforeId}` : ''}`
    return this.request<{ messages: GroupMeMessage[] }>(params)
  }

  async getDMMessages(
    otherUserId: string,
    limit = 40,
    beforeId?: string
  ): Promise<{ direct_messages: GroupMeMessage[] }> {
    const params = `/direct_messages?other_user_id=${otherUserId}&limit=${limit}${beforeId ? `&before_id=${beforeId}` : ''}`
    return this.request<{ direct_messages: GroupMeMessage[] }>(params)
  }

  async sendGroupMessage(groupId: string, text: string, attachments: GroupMeMessage['attachments'] = []) {
    return this.request(`/groups/${groupId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          source_guid: `d360_${Date.now()}${Math.random().toString(36).slice(2)}`,
          text,
          attachments,
        },
      }),
    })
  }

  async sendDM(recipientId: string, text: string, attachments: GroupMeMessage['attachments'] = []) {
    return this.request('/direct_messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        direct_message: {
          source_guid: `d360_${Date.now()}${Math.random().toString(36).slice(2)}`,
          recipient_id: recipientId,
          text,
          attachments,
        },
      }),
    })
  }

  async likeMessage(groupId: string, messageId: string) {
    return this.request(`/messages/${groupId}/${messageId}/like`, {
      method: 'POST',
    })
  }

  async unlikeMessage(groupId: string, messageId: string) {
    return this.request(`/messages/${groupId}/${messageId}/unlike`, {
      method: 'POST',
    })
  }

  async deleteMessage(groupId: string, messageId: string) {
    if (!this.token) throw new Error('No token set')
    return this.enqueue(async () => {
      const res = await fetch(
        `${PROXY_BASE}/conversations/${groupId}/messages/${messageId}?token=${this.token}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error(`Delete failed ${res.status}`)
    })
  }

  async addMemberToGroup(groupId: string, userId: string, nickname: string) {
    return this.request(`/groups/${groupId}/members/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        members: [{ user_id: userId, nickname }],
      }),
    })
  }

  async getGroupMembers(groupId: string): Promise<{ id: string; user_id: string; nickname: string; image_url: string }[]> {
    const group = await this.request<GroupMeGroup>(`/groups/${groupId}`)
    return group.members || []
  }

  async uploadImage(file: File): Promise<string> {
    return this.enqueue(async () => {
      const res = await fetch(`${PROXY_BASE}/pictures?token=${this.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      return data.payload?.url || data.payload?.picture_url || ''
    })
  }
}

export const api = new GroupMeAPI()
