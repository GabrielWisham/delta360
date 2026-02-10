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
  FileText,
  MapPin,
  Play,
  Pencil,
} from 'lucide-react'
import type { GroupMeMessage } from '@/lib/types'

const QUICK_EMOJIS = ['\u2764\uFE0F', '\uD83D\uDD25', '\uD83D\uDE02', '\uD83D\uDC4D', '\uD83D\uDE2E', '\uD83D\uDE22']

export const MessageCard = memo(function MessageCard({
  msg,
  panelIdx,
  showGroupTag,
  onScrollToMsg,
  onReply,
  replyNameMap,
}: {
  msg: GroupMeMessage
  panelIdx: number
  showGroupTag?: boolean
  onScrollToMsg?: (id: string) => void
  onReply?: (msg: GroupMeMessage) => void
  replyNameMap?: Map<string, string>
}) {
  const store = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')

  const isSelf = msg.user_id === store.user?.id || msg.sender_id === store.user?.id
  const isDm = !msg.group_id
  const isPinned = !!store.pinnedMessages[msg.id]
  // For DMs, chatId should always be the OTHER user's ID (matching view.id)
  const chatId = msg.group_id || (isDm ? (isSelf ? msg.recipient_id : msg.sender_id) : '') || ''
  const chatAlerts = store.chatAlertWords?.[chatId] || []
  const allAlerts = [...store.alertWords, ...chatAlerts]
  const isAlertMsg = allAlerts.some(w => msg.text?.toLowerCase().includes(w.toLowerCase()))
  const compact = store.compact

  const replyAttachment = msg.attachments?.find(a => a.type === 'reply')
  const replyToName = replyAttachment?.reply_id ? (replyNameMap?.get(replyAttachment.reply_id) || null) : null
  const imageAttachments = msg.attachments?.filter(a => (a.type === 'image' || a.type === 'linked_image') && a.url) || []
  const videoAttachments = msg.attachments?.filter(a => a.type === 'video' && a.url) || []
  const fileAttachments = msg.attachments?.filter(a => a.type === 'file') || []
  const locationAttachments = msg.attachments?.filter(a => a.type === 'location' && a.lat && a.lng) || []
  const hasMediaAttachments = imageAttachments.length > 0 || videoAttachments.length > 0 || fileAttachments.length > 0 || locationAttachments.length > 0
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

  function startEdit() {
    setEditText(msg.text?.replace(/ \[edited\]$/, '') || '')
    setIsEditing(true)
  }

  async function submitEdit() {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === msg.text?.replace(/ \[edited\]$/, '')) {
      setIsEditing(false)
      return
    }
    const newText = `${trimmed} [edited]`
    const groupId = msg.group_id || ''
    // For DMs, find the other user's ID (the recipient)
    const otherUserId = msg.recipient_id || (
      msg.sender_id !== store.user?.id ? msg.sender_id :
      msg.user_id !== store.user?.id ? msg.user_id : ''
    ) || ''
    // Delete old, send new
    await store.deleteMessage(groupId, msg.id)
    if (groupId) {
      await store.sendMessageDirect('group', groupId, newText, msg.attachments || [])
    } else if (otherUserId) {
      // In a DM we sent, the recipient is the other user
      const dmTarget = msg.conversation_id
        ? msg.conversation_id.split('+').find(id => id !== store.user?.id) || otherUserId
        : otherUserId
      await store.sendMessageDirect('dm', dmTarget, newText, msg.attachments || [])
    }
    setIsEditing(false)
  }

  function handleQuickEmoji(emoji: string) {
    const groupId = msg.group_id || ''
    if (groupId) {
      // Group: send as a threaded reply with reply attachment
      store.sendMessageDirect('group', groupId, emoji, [
        { type: 'reply' as const, reply_id: msg.id, base_reply_id: msg.id }
      ])
    } else {
      // DM: GroupMe doesn't support reply attachments, so quote the original
      const recipientId = msg.recipient_id || (
        msg.sender_id !== store.user?.id ? msg.sender_id :
        msg.user_id !== store.user?.id ? msg.user_id : ''
      ) || ''
      const dmTarget = msg.conversation_id
        ? msg.conversation_id.split('+').find(id => id !== store.user?.id) || recipientId
        : recipientId
      // Build a quoted reply: include a snippet of the original message
      const snippet = msg.text
        ? msg.text.length > 40 ? msg.text.slice(0, 40) + '...' : msg.text
        : '(attachment)'
      const replyText = `${emoji}\n> ${msg.name}: ${snippet}`
      if (dmTarget) store.sendMessageDirect('dm', dmTarget, replyText, [])
    }
  }

  /* ======================================= */
  /*  COMPACT MODE                            */
  /* ======================================= */
  // Deleted message: render a subtle system-style bubble
  if (msg._deleted) {
    return (
      <div
        id={`msg-${msg.id}`}
        data-msg-id={msg.id}
        className="flex justify-center py-1.5 px-2"
      >
        <span
          className="text-[10px] text-muted-foreground/60 italic px-3 py-1 rounded-full bg-muted/30 border border-border/30"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Message deleted
        </span>
      </div>
    )
  }

  if (compact) {
    return (
      <div
        id={`msg-${msg.id}`}
        data-msg-id={msg.id}
        className={`group/msg relative flex items-start gap-2 py-1 px-2 rounded-xl transition-colors hover:bg-white/5 ${
          isSelf ? 'flex-row-reverse' : ''
        }`}
      >
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {msg.avatar_url ? (
            <img src={msg.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover ring-1" style={{ '--tw-ring-color': 'var(--d360-avatar-ring)' } as React.CSSProperties} />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ring-1"
              style={{ background: `${accentColor}22`, color: accentColor, '--tw-ring-color': 'var(--d360-avatar-ring)' } as React.CSSProperties}
            >
              {msg.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Bubble */}
        <div className={`relative max-w-[75%] min-w-0 ${isSelf ? 'items-end' : 'items-start'}`}>
          {/* Reply indicator */}
          {replyAttachment && (
            <button
              onClick={() => onScrollToMsg?.(replyAttachment.reply_id || '')}
              className="flex items-center gap-1 text-[8px] opacity-50 hover:opacity-100 mb-0.5"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <CornerDownLeft className="w-2.5 h-2.5" />
              {replyToName ? `replying to ${replyToName}` : 'reply'}
            </button>
          )}

          <div
            data-bubble
            className={`rounded-2xl px-3.5 py-2 transition-shadow ${
              isSelf ? 'rounded-tr-sm' : 'rounded-tl-sm'
            } ${isPinned ? 'ring-1 ring-[var(--d360-yellow)]/40' : ''}`}
            style={isSelf
              ? { background: 'var(--d360-bubble-self-bg)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--d360-bubble-self-border)' }
              : { background: `color-mix(in srgb, ${accentColor} var(--d360-bubble-other-mix), transparent)`, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--d360-bubble-other-border)' }
            }
          >
            {/* Sender + timestamp header */}
            <div className={`flex items-center gap-1.5 mb-0.5 ${isSelf ? 'justify-end' : ''}`}>
              {!isSelf && (
                <button
                  onClick={() => {
                    const uid = msg.user_id || msg.sender_id
                    if (uid && uid !== store.user?.id) store.switchView('dm', uid)
                  }}
                  className={`hover:underline decoration-1 underline-offset-2 ${
                    !msg.group_id
                      ? 'text-[8px] font-medium tracking-wide opacity-40'
                      : 'text-[10px] font-bold uppercase tracking-wide'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)', color: accentColor }}
                >
                  {msg.name}
                </button>
              )}
              {showGroupTag && groupName && (
                <button
                  onClick={() => store.switchView('group', msg.group_id || '')}
                  className="text-[9px] px-2 py-0.5 rounded-full border border-border bg-secondary/50 font-medium truncate max-w-[140px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
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

            {/* Text / Inline edit */}
            {isEditing ? (
              <div className="flex flex-col gap-1 w-full">
                <textarea
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit() } if (e.key === 'Escape') setIsEditing(false) }}
                  className="w-full text-xs leading-relaxed bg-background/60 border border-border rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
                  rows={2}
                />
                <div className="flex items-center gap-1.5">
                  <button onClick={submitEdit} className="text-[9px] font-medium px-2 py-0.5 rounded bg-[var(--d360-orange)] text-white hover:opacity-80 transition-opacity" style={{ fontFamily: 'var(--font-mono)' }}>Save</button>
                  <button onClick={() => setIsEditing(false)} className="text-[9px] font-medium px-2 py-0.5 rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>Cancel</button>
                  <span className="text-[8px] text-muted-foreground/40 ml-auto" style={{ fontFamily: 'var(--font-mono)' }}>esc to cancel</span>
                </div>
              </div>
            ) : msg.text ? (
              <p className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                isAlertMsg ? 'font-semibold' : ''
              }`} style={{ overflowWrap: 'anywhere', ...(isAlertMsg ? { color: 'var(--d360-red)' } : undefined) }}>
                {msg.text}
              </p>
            ) : null}

            {/* Attachments */}
            {hasMediaAttachments && (
              <AttachmentBlock
                imageAttachments={imageAttachments}
                videoAttachments={videoAttachments}
                fileAttachments={fileAttachments}
                locationAttachments={locationAttachments}
                compact
                onLightbox={(url) => store.setLightboxUrl(url)}
              />
            )}

            {/* Always-visible reply + likes */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onReply?.(msg)}
                className="flex items-center gap-1 px-2 py-1 -ml-2 rounded-md text-muted-foreground/40 hover:text-[var(--d360-orange)] hover:bg-[var(--d360-orange)]/10 transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5" />
                <span className="text-[9px] font-medium">Reply</span>
              </button>
              {!isDm && likeNames.length > 0 && (
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
          <div className={`absolute ${isSelf ? 'right-full mr-1' : 'left-full ml-1'} top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col items-end gap-0.5 z-10`}>
            {/* Quick emoji reaction tray */}
            <div className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1 py-0.5 shadow-md">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => handleQuickEmoji(e)} className="w-6 h-6 flex items-center justify-center rounded-full text-sm hover:bg-muted/60 hover:scale-110 transition-all" title={`React ${e}`}>
                  {e}
                </button>
              ))}
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-md">
              {!isDm && <CompactAction Icon={ThumbsUp} title="Like" active={likedBy.includes(store.user?.id || '')} onClick={() => {
                const gid = msg.group_id || ''
                if (likedBy.includes(store.user?.id || '')) store.unlikeMessage(gid, msg.id)
                else store.likeMessage(gid, msg.id)
              }} />}
              <CompactAction Icon={Pin} title="Pin" active={isPinned} onClick={() => store.togglePinMessage(msg.id)} />
              <CompactAction Icon={Forward} title="Forward" onClick={() => store.setForwardMsg({ id: msg.id, name: msg.name, text: msg.text || '', groupId: msg.group_id })} />
              {isSelf && <CompactAction Icon={Pencil} title="Edit" onClick={startEdit} />}
              {isSelf && <CompactAction Icon={Trash2} title={confirmDelete ? 'Confirm?' : 'Delete'} danger active={confirmDelete} onClick={handleDelete} />}
            </div>
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
      data-msg-id={msg.id}
      className={`group/msg relative flex items-start gap-2.5 ${isSelf ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {msg.avatar_url ? (
          <img src={msg.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-1" style={{ '--tw-ring-color': 'var(--d360-avatar-ring)' } as React.CSSProperties} />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-1"
            style={{ background: `${accentColor}22`, color: accentColor, '--tw-ring-color': 'var(--d360-avatar-ring)' } as React.CSSProperties}
          >
            {msg.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[70%] min-w-0 flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
        {/* Reply indicator */}
        {replyAttachment && (
          <button
            onClick={() => onScrollToMsg?.(replyAttachment.reply_id || '')}
            className="flex items-center gap-1 text-[9px] opacity-50 hover:opacity-100 mb-0.5"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>{replyToName ? `Replying to ${replyToName}` : 'Reply'}</span>
          </button>
        )}

        <div
          data-bubble
          className={`rounded-2xl px-4 py-2.5 transition-shadow ${
            isSelf ? 'rounded-tr-sm' : 'rounded-tl-sm'
          } ${isPinned ? 'ring-1 ring-[var(--d360-yellow)]/40' : ''}`}
          style={isSelf
            ? { background: 'var(--d360-bubble-self-bg)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--d360-bubble-self-border)' }
            : { background: `color-mix(in srgb, ${accentColor} var(--d360-bubble-other-mix), transparent)`, borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--d360-bubble-other-border)' }
          }
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
                className={`hover:underline decoration-1 underline-offset-2 ${
                  !msg.group_id
                    ? 'text-[9px] font-medium tracking-wide opacity-40'
                    : 'text-[11px] uppercase tracking-wider font-semibold'
                }`}
                style={{ fontFamily: 'var(--font-mono)', color: accentColor }}
              >
                {msg.name}
              </button>
            )}

            {showGroupTag && groupName && (
              <button
                onClick={() => store.switchView('group', msg.group_id || '')}
                className="text-[10px] px-2.5 py-0.5 rounded-full border border-border bg-secondary/50 font-medium truncate max-w-[160px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
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

          {/* Body / Inline edit */}
          {isEditing ? (
            <div className="flex flex-col gap-1.5 w-full">
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit() } if (e.key === 'Escape') setIsEditing(false) }}
                className="w-full text-sm leading-6 bg-background/60 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <button onClick={submitEdit} className="text-[10px] font-medium px-3 py-1 rounded-md bg-[var(--d360-orange)] text-white hover:opacity-80 transition-opacity" style={{ fontFamily: 'var(--font-mono)' }}>Save</button>
                <button onClick={() => setIsEditing(false)} className="text-[10px] font-medium px-3 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted/40 transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>Cancel</button>
                <span className="text-[9px] text-muted-foreground/40 ml-auto" style={{ fontFamily: 'var(--font-mono)' }}>esc to cancel</span>
              </div>
            </div>
          ) : msg.text ? (
            <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${
              isAlertMsg ? 'font-semibold' : ''
            }`} style={{ overflowWrap: 'anywhere', ...(isAlertMsg ? { color: 'var(--d360-red)' } : undefined) }}>
              {msg.text}
            </p>
          ) : null}

          {/* Attachments */}
          {hasMediaAttachments && (
            <AttachmentBlock
              imageAttachments={imageAttachments}
              videoAttachments={videoAttachments}
              fileAttachments={fileAttachments}
              locationAttachments={locationAttachments}
              onLightbox={(url) => store.setLightboxUrl(url)}
            />
          )}

          {/* Inline actions row -- reply is always visible */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              onClick={() => onReply?.(msg)}
              className="flex items-center gap-1.5 px-2.5 py-1 -ml-2.5 rounded-lg text-[10px] font-medium text-muted-foreground/50 hover:text-[var(--d360-orange)] hover:bg-[var(--d360-orange)]/10 transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
              title="Reply"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
            {!isDm && likeNames.length > 0 && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/40 ml-1">
                <ThumbsUp className="w-3 h-3" />
                <span style={{ fontFamily: 'var(--font-mono)' }}>{likeNames.join(', ')}</span>
              </span>
            )}
          </div>
        </div>

          {/* Hover action tray (pin, like, forward, delete) */}
          <div className={`absolute ${isSelf ? 'right-full mr-1' : 'left-full ml-1'} top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col items-end gap-0.5 z-10`}>
            {/* Quick emoji reaction tray */}
            <div className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-md">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => handleQuickEmoji(e)} className="w-7 h-7 flex items-center justify-center rounded-full text-base hover:bg-muted/60 hover:scale-110 transition-all" title={`React ${e}`}>
                  {e}
                </button>
              ))}
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-md">
              {!isDm && <CompactAction Icon={ThumbsUp} title="Like" active={likedBy.includes(store.user?.id || '')} onClick={() => {
                const gid = msg.group_id || ''
                if (likedBy.includes(store.user?.id || '')) store.unlikeMessage(gid, msg.id)
                else store.likeMessage(gid, msg.id)
              }} />}
              <CompactAction Icon={Pin} title="Pin" active={isPinned} onClick={() => store.togglePinMessage(msg.id)} />
              <CompactAction Icon={Forward} title="Forward" onClick={() => store.setForwardMsg({ id: msg.id, name: msg.name, text: msg.text || '', groupId: msg.group_id })} />
              {isSelf && <CompactAction Icon={Pencil} title="Edit" onClick={startEdit} />}
              {isSelf && <CompactAction Icon={Trash2} title={confirmDelete ? 'Confirm?' : 'Delete'} danger active={confirmDelete} onClick={handleDelete} />}
            </div>
          </div>
      </div>
    </div>
  )
})

/* ======================================= */
/*  Sub-components                          */
/* ======================================= */

function AttachmentBlock({
  imageAttachments,
  videoAttachments,
  fileAttachments,
  locationAttachments,
  compact,
  onLightbox,
}: {
  imageAttachments: { url?: string }[]
  videoAttachments: { url?: string; preview_url?: string }[]
  fileAttachments: { file_id?: string; name?: string }[]
  locationAttachments: { lat?: string; lng?: string; name?: string }[]
  compact?: boolean
  onLightbox: (url: string) => void
}) {
  const imgSize = compact ? 'w-20 h-14' : 'max-w-[180px] max-h-[120px]'
  const gap = compact ? 'gap-1' : 'gap-2'

  return (
    <>
      {/* Images */}
      {imageAttachments.length > 0 && (
        <div className={`flex flex-wrap ${gap} mt-1`}>
          {imageAttachments.map((att, i) => (
            <img
              key={i}
              src={att.url}
              alt="Attachment"
              className={`${imgSize} rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => onLightbox(att.url || '')}
            />
          ))}
        </div>
      )}

      {/* Videos */}
      {videoAttachments.length > 0 && (
        <div className={`flex flex-wrap ${gap} mt-1`}>
          {videoAttachments.map((att, i) => (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative ${imgSize} rounded-lg overflow-hidden bg-black/20 border border-border flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}
            >
              {att.preview_url ? (
                <img src={att.preview_url} alt="Video" className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              <div className="relative z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Files */}
      {fileAttachments.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {fileAttachments.map((att, i) => (
            <a
              key={i}
              href={att.file_id ? `https://file.groupme.com/v1/files/${att.file_id}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-xs"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-foreground">{att.name || 'File attachment'}</span>
            </a>
          ))}
        </div>
      )}

      {/* Locations */}
      {locationAttachments.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {locationAttachments.map((att, i) => (
            <a
              key={i}
              href={`https://www.google.com/maps?q=${att.lat},${att.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-xs"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-foreground">{att.name || `${att.lat}, ${att.lng}`}</span>
            </a>
          ))}
        </div>
      )}
    </>
  )
}

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
