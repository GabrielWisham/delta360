'use client'

import { useStore } from '@/lib/store'
import { api } from '@/lib/groupme-api'

export function ForwardModal() {
  const store = useStore()

  if (!store.forwardMsg) return null

  const { name, text } = store.forwardMsg
  const fwdText = `[FWD from ${name}]: ${text}`

  async function handleForward(type: 'group' | 'dm', id: string) {
    try {
      if (type === 'group') {
        await api.sendGroupMessage(id, fwdText)
      } else {
        await api.sendDM(id, fwdText)
      }
      store.showToast('Forwarded', 'Message sent')
    } catch {
      store.showToast('Error', 'Forward failed')
    }
    store.setForwardMsg(null)
  }

  return (
    <div className="glass fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass w-full max-w-md max-h-[70vh] rounded-xl flex flex-col overflow-hidden shadow-2xl m-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-xs uppercase tracking-widest text-foreground" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Forward Message
          </h2>
          <button onClick={() => store.setForwardMsg(null)} className="text-muted-foreground hover:text-foreground">
            {'\u2715'}
          </button>
        </div>

        <div className="px-4 py-2 border-b border-border">
          <p className="text-[10px] text-muted-foreground line-clamp-2" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            {fwdText}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground px-2 mb-1" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            Groups
          </div>
          {store.groups.map(g => (
            <button
              key={g.id}
              onClick={() => handleForward('group', g.id)}
              className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-secondary/40 text-foreground transition-colors"
              style={{ fontFamily: 'var(--font-jetbrains)' }}
            >
              {g.name}
            </button>
          ))}

          <div className="text-[9px] uppercase tracking-widest text-muted-foreground px-2 mb-1 mt-2" style={{ fontFamily: 'var(--font-jetbrains)' }}>
            DMs
          </div>
          {store.dmChats
            .filter(d => store.approved[d.other_user?.id] !== false)
            .map(d => (
              <button
                key={d.other_user.id}
                onClick={() => handleForward('dm', d.other_user.id)}
                className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-secondary/40 text-foreground transition-colors"
                style={{ fontFamily: 'var(--font-jetbrains)' }}
              >
                {d.other_user.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
