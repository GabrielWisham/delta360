// Delta 360 - GroupMe API Client

import type {
  GroupMeUser,
  GroupMeGroup,
  GroupMeDMChat,
  GroupMeMessage,
} from './types'

const BASE = 'https://api.groupme.com/v3'
const IMAGE_BASE = 'https://image.groupme.com/pictures'

class GroupMeAPI {
  private token = ''

  setToken(token: string) {
    this.token = token
  }

  getToken() {
    return this.token
  }

  private async request<T>(
    endpoint: string,
    opts: RequestInit = {}
  ): Promise<T> {
    if (!this.token) throw new Error('No token set')
    const sep = endpoint.includes('?') ? '&' : '?'
    const url = `${BASE}${endpoint}${sep}token=${this.token}`
    const res = await fetch(url, opts)
    if (res.status === 401) throw new Error('Unauthorized')
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    return data.response as T
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
    limit = 40
  ): Promise<{ messages: GroupMeMessage[] }> {
    return this.request<{ messages: GroupMeMessage[] }>(
      `/groups/${groupId}/messages?limit=${limit}`
    )
  }

  async getDMMessages(
    otherUserId: string,
    limit = 40
  ): Promise<{ direct_messages: GroupMeMessage[] }> {
    return this.request<{ direct_messages: GroupMeMessage[] }>(
      `/direct_messages?other_user_id=${otherUserId}&limit=${limit}`
    )
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
    const res = await fetch(
      `${BASE}/conversations/${groupId}/messages/${messageId}?token=${this.token}`,
      { method: 'DELETE' }
    )
    if (!res.ok) throw new Error(`Delete failed ${res.status}`)
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
    const res = await fetch(IMAGE_BASE, {
      method: 'POST',
      headers: {
        'X-Access-Token': this.token,
        'Content-Type': file.type,
      },
      body: file,
    })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    return data.payload?.url || data.payload?.picture_url || ''
  }
}

export const api = new GroupMeAPI()
