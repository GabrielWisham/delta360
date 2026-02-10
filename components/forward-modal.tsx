'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/groupme-api'
import { X, Forward, Users, MessageCircle } from 'lucide-react'

export function ForwardModal() {
  const store = useStore()

  const { name, text } = store.forwardMsg!
  const fwdText = `[FWD from ${name}]: ${text}`

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') store.setForwardMsg(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

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

  const approvedDms = store.dmChats.filter(d => store.approved[d.other_user?.id] !== false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => store.setForwardMsg(null)} />
      <div className="relative w-full max-w-md h-[min(70vh,520px)] mx-4 rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Forward className="w-3.5 h-3.5 text-[var(--d360-orange)]" />
            <h2 className="text-xs uppercase tracking-widest text-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Forward Message
            </h2>
          </div>
          <button onClick={() => store.setForwardMsg(null)} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-4 py-2.5 border-b border-border bg-secondary/10">
          <p className="text-[10px] text-muted-foreground line-clamp-2 whitespace-pre-wrap" style={{ fontFamily: 'var(--font-mono)' }}>
            {fwdText}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {/* Groups */}
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground px-2 py-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
            <Users className="w-3 h-3" />
            Groups
          </div>
          {store.groups.map(g => (
            <button
              key={g.id}
              onClick={() => handleForward('group', g.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-secondary/40 text-foreground transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {g.name}
            </button>
          ))}

          {/* DMs */}
          {approvedDms.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
                <MessageCircle className="w-3 h-3" />
                DMs
              </div>
              {approvedDms.map(d => (
                <button
                  key={d.other_user.id}
                  onClick={() => handleForward('dm', d.other_user.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-secondary/40 text-foreground transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {d.other_user.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
