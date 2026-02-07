// Delta 360 - Date formatting helpers

export function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000)
  const now = new Date()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yest ${time}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

export function formatTimeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function getHeat(ts: number, now: number): number {
  return Math.max(5, Math.round(100 * (1 - (now - ts) / 21600)))
}

export function getDayLabel(ts: number): string {
  const d = new Date(ts * 1000)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getFullDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getLastMsgTs(g: { messages?: { last_message_created_at?: number }; updated_at?: number }): number {
  return g.messages?.last_message_created_at || g.updated_at || 0
}
