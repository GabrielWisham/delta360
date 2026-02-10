'use client'

import { useState, memo } from 'react'
import { useStore } from '@/lib/store'
import { formatTimestamp, getFullDate } from '@/lib/date-helpers'
import {
  CornerDownLeft,
  Pin,
  ThumbsUp,
  Forward,
  Trash2,
  Reply,
} from 'lucide-react'
import type { GroupMeMessage } from '@/lib/types'

export const MessageCard = memo(function MessageCard({
  msg,
  panelIdx,
  showGroupTag,
  onScrollToMsg,
  onReply,
}: {
  msg: GroupMeMessage
  panelIdx: number
  showGroupTag?: boolean
  onScrollToMsg?: (id: string) => void
  onReply?: (msg: GroupMeMessage) => void
}) {
  const store = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isSelf = msg.user_id === store.user?.id || msg.sender_id === store.user?.id
  const isPinned = !!store.pinnedMessages[msg.id]
  const chatId = msg.group_id || msg.recipient_id || msg.sender_id || ''
  const chatAlerts = store.chatAlertWords?.[chatId] || []
  const allAlerts = [...store.alertWords, ...chatAlerts]
  const isAlertMsg = allAlerts.some(w => msg.text?.toLowerCase().includes(w.toLowerCase()))
  const compact = store.compact

  const replyAttachment = msg.attachments?.find(a => a.type === 'reply')
  const imageAttachments = msg.attachments?.filter(a => a.type === 'image' && a.url) || []
  const groupName = msg.group_id ? store.groups.find(g => g.id === msg.group_id)?.name : null

  // Likes
  const likedBy = msg.favorited_by || []
  const likeNames = likedBy.map(uid => {
    for (const g of store.groups) {
      const m = g.members?.find(mem => mem.user_id === uid)
      if (m) return m.nickname
    }
    return uid === store.user?.id ? 'You' : uid
  })

  const accentColor = isPinned
    ? 'var(--d360-yellow)'
    : isSelf
      ? 'var(--d360-purple)'
      : msg.group_id
        ? 'var(--d360-orange)'
        : 'var(--d360-cyan)'

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await store.deleteMessage(msg.group_id || '', msg.id)
    setConfirmDelete(false)
  }

  /* ======================================= */
  /*  COMPACT MODE                            */
  /* ======================================= */
  if (compact) {
    return (
      <div
        id={`msg-${msg.id}`}
        className={`group/msg relative flex items-start gap-2 py-1 px-2 rounded-xl transition-colors hover:bg-white/5 ${
          isSelf ? 'flex-row-reverse' : ''
        }`}
      >
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {msg.avatar_url ? (
            <img src={msg.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: `${accentColor}22`, color: accentColor }}
            >
              {msg.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Bubble */}
        <div className={`relative max-w-[75%] min-w-[120px] ${isSelf ? 'items-end' : 'items-start'}`}>
          {/* Reply indicator */}
          {replyAttachment && (
            <button
              onClick={() => onScrollToMsg?.(replyAttachment.reply_id || '')}
              className="flex items-center gap-1 text-[8px] opacity-50 hover:opacity-100 mb-0.5"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <CornerDownLeft className="w-2.5 h-2.5" />
              reply
            </button>
          )}

          <div
            className={`rounded-2xl px-3.5 py-2 ${
              isSelf
                ? 'rounded-tr-sm bg-[var(--d360-orange)]/12 border border-[var(--d360-orange)]/15'
                : 'rounded-tl-sm border border-white/[0.08]'
            } ${isPinned ? 'ring-1 ring-[var(--d360-yellow)]/40' : ''}`}
            style={!isSelf ? { background: `color-mix(in srgb, ${accentColor} 8%, transparent)` } : undefined}
          >
            {/* Sender + timestamp header */}
            <div className={`flex items-center gap-1.5 mb-0.5 ${isSelf ? 'justify-end' : ''}`}>
              {!isSelf && (
                <button
                  onClick={() => {
                    const uid = msg.user_id || msg.sender_id
                    if (uid && uid !== store.user?.id) store.switchView('dm', uid)
                  }}
                  className="text-[10px] font-bold uppercase tracking-wide hover:underline decoration-1 underline-offset-2"
                  style={{ fontFamily: 'var(--font-mono)', color: accentColor }}
                >
                  {msg.name}
                </button>
              )}
              {showGroupTag && groupName && (
                <button
                  onClick={() => store.switchView('group', msg.group_id || '')}
                  className="text-[8px] px-1.5 py-[1px] rounded-full bg-secondary/60 opacity-60 hover:opacity-100 truncate max-w-[70px]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {groupName}
                </button>
              )}
              <span
                className="text-[8px] opacity-40 tabular-nums cursor-help"
                style={{ fontFamily: 'var(--font-mono)' }}
                title={getFullDate(msg.created_at)}
              >
                {formatTimestamp(msg.created_at)}
              </span>
            </div>

            {/* Text */}
            {msg.text && (
              <p className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                isAlertMsg ? 'font-semibold' : ''
              }`} style={isAlertMsg ? { color: 'var(--d360-red)' } : undefined}>
                {msg.text}
              </p>
            )}

            {/* Images */}
            {imageAttachments.length > 0 && (
              <div className="flex gap-1 mt-1">
                {imageAttachments.map((att, i) => (
                  <img
                    key={i}
                    src={att.url}
                    alt="Attachment"
                    className="w-20 h-14 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => store.setLightboxUrl(att.url || '')}
                  />
                ))}
              </div>
            )}

            {/* Always-visible reply + likes */}
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => onReply?.(msg)}
                className="text-muted-foreground/30 hover:text-[var(--d360-orange)] transition-colors"
                title="Reply"
              >
                <Reply className="w-3 h-3" />
              </button>
              {likeNames.length > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-2.5 h-2.5 opacity-40" />
                  <span className="text-[8px] opacity-40" style={{ fontFamily: 'var(--font-mono)' }}>
                    {likeNames.length}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Hover action tray (like, pin, forward, delete) */}
          <div className={`absolute ${isSelf ? 'right-full mr-1' : 'left-full ml-1'} top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-md z-10`}>
            <CompactAction Icon={ThumbsUp} title="Like" active={likedBy.includes(store.user?.id || '')} onClick={() => {
              const gid = msg.group_id || ''
              if (likedBy.includes(store.user?.id || '')) store.unlikeMessage(gid, msg.id)
              else store.likeMessage(gid, msg.id)
            }} />
            <CompactAction Icon={Pin} title="Pin" active={isPinned} onClick={() => store.togglePinMessage(msg.id)} />
            <CompactAction Icon={Forward} title="Forward" onClick={() => store.setForwardMsg({ id: msg.id, name: msg.name, text: msg.text || '', groupId: msg.group_id })} />
            {isSelf && <CompactAction Icon={Trash2} title={confirmDelete ? 'Confirm?' : 'Delete'} danger active={confirmDelete} onClick={handleDelete} />}
          </div>
        </div>
      </div>
    )
  }

  /* ======================================= */
  /*  STANDARD MODE - Bubble layout           */
  /* ======================================= */
  return (
    <div
      id={`msg-${msg.id}`}
      className={`group/msg relative flex items-start gap-2.5 ${isSelf ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {msg.avatar_url ? (
          <img src={msg.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-1 ring-white/10"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {msg.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[70%] min-w-[160px] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
        {/* Reply indicator */}
        {replyAttachment && (
          <button
            onClick={() => onScrollToMsg?.(replyAttachment.reply_id || '')}
            className="flex items-center gap-1 text-[9px] opacity-50 hover:opacity-100 mb-0.5"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>Reply</span>
          </button>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 transition-all ${
            isSelf
              ? 'rounded-tr-sm bg-[var(--d360-orange)]/12 border border-[var(--d360-orange)]/15'
              : 'rounded-tl-sm border border-white/[0.08]'
          } ${isPinned ? 'ring-1 ring-[var(--d360-yellow)]/40' : ''}`}
          style={!isSelf ? { background: `color-mix(in srgb, ${accentColor} 8%, transparent)` } : undefined}
        >
          {/* Pinned badge */}
          {isPinned && (
            <div className="flex items-center gap-1 mb-1">
              <Pin className="w-2.5 h-2.5" style={{ color: 'var(--d360-yellow)' }} />
              <span className="text-[8px] uppercase tracking-widest font-semibold" style={{ color: 'var(--d360-yellow)', fontFamily: 'var(--font-mono)' }}>Pinned</span>
            </div>
          )}

          {/* Header row */}
          <div className={`flex items-center gap-2 mb-1 ${isSelf ? 'justify-end' : ''}`}>
            {!isSelf && (
              <button
                onClick={() => {
                  const uid = msg.user_id || msg.sender_id
                  if (uid && uid !== store.user?.id) store.switchView('dm', uid)
                }}
                className="text-[11px] uppercase tracking-wider font-semibold hover:underline decoration-1 underline-offset-2"
                style={{ fontFamily: 'var(--font-mono)', color: accentColor }}
              >
                {msg.name}
              </button>
            )}

            {showGroupTag && groupName && (
              <button
                onClick={() => store.switchView('group', msg.group_id || '')}
                className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 opacity-50 hover:opacity-100 truncate max-w-[80px]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {groupName}
              </button>
            )}

            <span className="flex-1" />

            <span
              className="text-[9px] opacity-40 shrink-0 tabular-nums cursor-help"
              style={{ fontFamily: 'var(--font-mono)' }}
              title={getFullDate(msg.created_at)}
            >
              {formatTimestamp(msg.created_at)}
            </span>
          </div>

          {/* Body */}
          {msg.text && (
            <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${
              isAlertMsg ? 'font-semibold' : ''
            }`} style={isAlertMsg ? { color: 'var(--d360-red)' } : undefined}>
              {msg.text}
            </p>
          )}

          {/* Images */}
          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1.5">
              {imageAttachments.map((att, i) => (
                <img
                  key={i}
                  src={att.url}
                  alt="Attachment"
                  className="max-w-[180px] max-h-[120px] rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover"
                  onClick={() => store.setLightboxUrl(att.url || '')}
                />
              ))}
            </div>
          )}

          {/* Inline actions row -- reply is always visible */}
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => onReply?.(msg)}
              className="flex items-center gap-1 text-[9px] text-muted-foreground/50 hover:text-[var(--d360-orange)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
              title="Reply"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
            {likeNames.length > 0 && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/40 ml-1">
                <ThumbsUp className="w-3 h-3" />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{likeNames.join(', ')}</span>
              </span>
            )}
          </div>
        </div>

          {/* Hover action tray (pin, like, forward, delete) */}
          <div className={`absolute ${isSelf ? 'right-full mr-1' : 'left-full ml-1'} top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-md z-10`}>
          <CompactAction Icon={ThumbsUp} title="Like" active={likedBy.includes(store.user?.id || '')} onClick={() => {
            const gid = msg.group_id || ''
            if (likedBy.includes(store.user?.id || '')) store.unlikeMessage(gid, msg.id)
            else store.likeMessage(gid, msg.id)
          }} />
          <CompactAction Icon={Pin} title="Pin" active={isPinned} onClick={() => store.togglePinMessage(msg.id)} />
          <CompactAction Icon={Forward} title="Forward" onClick={() => store.setForwardMsg({ id: msg.id, name: msg.name, text: msg.text || '', groupId: msg.group_id })} />
          {isSelf && <CompactAction Icon={Trash2} title={confirmDelete ? 'Confirm?' : 'Delete'} danger active={confirmDelete} onClick={handleDelete} />}
        </div>
      </div>
    </div>
  )
})

/* ======================================= */
/*  Sub-components                          */
/* ======================================= */

function CompactAction({ Icon, title, active, danger, onClick }: {
  Icon: typeof Reply
  title: string
  active?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-[3px] rounded-full transition-colors ${
        danger
          ? active ? 'text-[var(--d360-red)]' : 'text-muted-foreground/40 hover:text-[var(--d360-red)]'
          : active ? 'text-[var(--d360-orange)]' : 'text-muted-foreground/40 hover:text-foreground'
      }`}
    >
      <Icon className="w-3 h-3" />
    </button>
  )
}
