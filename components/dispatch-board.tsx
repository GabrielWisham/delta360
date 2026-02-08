'use client'

import { useStore } from '@/lib/store'

export function DispatchBoard() {
  const { teamStatus, user, myStatus, syncGroupId } = useStore()

  if (!syncGroupId) return null

  const statusLabel: Record<string, string> = { avl: 'Available', bsy: 'Busy', awy: 'Away' }
  const statusColor: Record<string, string> = {
    avl: 'var(--d360-green)',
    bsy: 'var(--d360-red)',
    awy: 'var(--d360-yellow)',
  }

  const entries = Object.entries(teamStatus)

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border overflow-x-auto">
      <span
        className="text-[9px] uppercase tracking-widest text-muted-foreground shrink-0"
        style={{ fontFamily: 'var(--font-jetbrains)' }}
      >
        Team
      </span>

      {/* Self chip */}
      {user && (
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] shrink-0 border"
          style={{
            fontFamily: 'var(--font-jetbrains)',
            borderColor: 'var(--d360-orange)',
            background: 'rgba(255, 92, 0, 0.1)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: statusColor[myStatus], boxShadow: `0 0 4px ${statusColor[myStatus]}` }}
          />
          <span className="uppercase tracking-wider text-foreground">{user.name}</span>
          <span className="text-muted-foreground">{statusLabel[myStatus]}</span>
        </div>
      )}

      {entries.map(([uid, member]) => {
        if (uid === user?.id) return null
        return (
          <div
            key={uid}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] shrink-0 border border-border"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor[member.status], boxShadow: `0 0 4px ${statusColor[member.status]}` }}
            />
            <span className="uppercase tracking-wider text-foreground">{member.name}</span>
            <span className="text-muted-foreground">{statusLabel[member.status]}</span>
          </div>
        )
      })}

      {entries.length === 0 && !user && (
        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          No team data
        </span>
      )}
    </div>
  )
}
