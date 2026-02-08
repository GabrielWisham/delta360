'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { formatTimestamp } from '@/lib/date-helpers'
import { EMOJIS } from '@/lib/types'
import type { GroupMeMessage } from '@/lib/types'

export function MessageCard({
  msg,
  panelIdx,
  showGroupTag,
  onScrollToMsg,
}: {
  msg: GroupMeMessage
  panelIdx: number
  showGroupTag?: boolean
  onScrollToMsg?: (id: string) => void
}) {
  const store = useStore()
  const [replyText, setReplyText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  const isSelf = msg.user_id === store.user?.id || msg.sender_id === store.user?.id
  const isPinned = !!store.pinnedMessages[msg.id]
  const isAlertMsg = store.alertWords.some(w => msg.text?.toLowerCase().includes(w.toLowerCase()))

  // Draft persistence
  useEffect(() => {
    const draft = sessionStorage.getItem(`gm_v3_drafts_${msg.id}`)
    if (draft) setReplyText(draft)
  }, [msg.id])

  useEffect(() => {
    if (replyText) sessionStorage.setItem(`gm_v3_drafts_${msg.id}`, replyText)
    else sessionStorage.removeItem(`gm_v3_drafts_${msg.id}`)
  }, [replyText, msg.id])

  // Close emoji on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false)
      }
    }
    if (emojiOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [emojiOpen])

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

  const borderColor = isPinned
    ? 'var(--d360-yellow)'
    : isSelf
      ? 'var(--d360-purple)'
      : msg.group_id
        ? 'var(--d360-orange)'
        : 'var(--d360-cyan)'

  const bgClass = isPinned
    ? 'bg-[rgba(255,204,0,0.06)]'
    : isSelf
      ? 'bg-[rgba(167,139,250,0.06)]'
      : ''

  async function handleReply() {
    if (!replyText.trim()) return
    const attachments = [{ type: 'reply', reply_id: msg.id, base_reply_id: msg.id }]
    await store.sendMessage(panelIdx, replyText.trim(), attachments)
    setReplyText('')
    sessionStorage.removeItem(`gm_v3_drafts_${msg.id}`)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await store.deleteMessage(msg.group_id || '', msg.id)
    setConfirmDelete(false)
  }

  return (
    <div
      id={`msg-${msg.id}`}
      className={`relative rounded-lg border-l-[3px] ${bgClass} ${store.compact ? 'px-2 py-1.5' : 'px-3 py-2'} transition-all hover:bg-secondary/30`}
      style={{
        borderLeftColor: borderColor,
        background: isPinned ? 'rgba(255,204,0,0.04)' : undefined,
      }}
    >
      {/* Pinned indicator */}
      {isPinned && (
        <span className="absolute top-1 right-2 text-[10px] text-[var(--d360-yellow)]">{'\u{1F4CC}'}</span>
      )}

      {/* Reply indicator */}
      {replyAttachment && (
        <button
          onClick={() => onScrollToMsg?.(replyAttachment.reply_id || '')}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[var(--d360-orange)] mb-1"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          <span>{'\u21A9'}</span>
          <span>Reply</span>
        </button>
      )}

      {/* Header row */}
      <div className={`flex items-center gap-2 ${store.compact ? 'mb-0.5' : 'mb-1'}`}>
        {/* Avatar */}
        {msg.avatar_url ? (
          <img
            src={msg.avatar_url}
            alt=""
            className="w-4 h-4 rounded-full object-cover shrink-0"
            crossOrigin="anonymous"
          />
        ) : (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{ background: 'var(--d360-glass)', color: borderColor }}
          >
            {msg.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* Sender name (clickable for DM) */}
        <button
          onClick={() => {
            const uid = msg.user_id || msg.sender_id
            if (uid && uid !== store.user?.id) {
              store.switchView('dm', uid)
            }
          }}
          className="text-[11px] uppercase tracking-wider font-semibold text-foreground hover:text-[var(--d360-orange)] transition-colors truncate"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          {msg.name}
        </button>

        {/* Group tag badge */}
        {showGroupTag && groupName && (
          <button
            onClick={() => store.switchView('group', msg.group_id || '')}
            className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px]"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
          >
            {groupName}
          </button>
        )}

        <span className="flex-1" />

        {/* Timestamp */}
        <span
          className="text-[9px] text-muted-foreground shrink-0"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
        >
          {formatTimestamp(msg.created_at)}
        </span>
      </div>

      {/* Body text */}
      {msg.text && (
        <div
          className={`whitespace-pre-wrap break-words ${store.compact ? 'text-xs' : 'text-sm'} text-foreground ${
            isAlertMsg ? 'border-l-2 border-l-[var(--d360-red)] pl-2' : ''
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Image attachments */}
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1.5">
          {imageAttachments.map((att, i) => (
            <img
              key={i}
              src={att.url}
              alt="Attachment"
              className="max-w-[200px] max-h-[150px] rounded-md cursor-pointer hover:opacity-80 transition-opacity object-cover"
              onClick={() => store.setLightboxUrl(att.url || '')}
              crossOrigin="anonymous"
            />
          ))}
        </div>
      )}

      {/* Likes row */}
      {likeNames.length > 0 && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
          <span>{'\u{1F44D}'}</span>
          <span>{likeNames.join(', ')}</span>
        </div>
      )}

      {/* Action bar */}
      <div className={`flex items-center gap-1 ${store.compact ? 'mt-1' : 'mt-2'} flex-wrap`}>
        {/* Like */}
        <ActionBtn
          label={`\u{1F44D}${likedBy.length > 0 ? ` ${likedBy.length}` : ''}`}
          active={likedBy.includes(store.user?.id || '')}
          onClick={() => {
            const gid = msg.group_id || ''
            if (likedBy.includes(store.user?.id || '')) {
              store.unlikeMessage(gid, msg.id)
            } else {
              store.likeMessage(gid, msg.id)
            }
          }}
        />

        {/* Pin */}
        <ActionBtn
          label={'\u{1F4CC}'}
          active={isPinned}
          onClick={() => store.togglePinMessage(msg.id)}
        />

        {/* Forward */}
        <ActionBtn
          label="FWD"
          onClick={() => store.setForwardMsg({
            id: msg.id,
            name: msg.name,
            text: msg.text || '',
            groupId: msg.group_id,
          })}
        />

        {/* Delete (self only) */}
        {isSelf && (
          <ActionBtn
            label={confirmDelete ? 'CONFIRM?' : 'DEL'}
            active={confirmDelete}
            danger
            onClick={handleDelete}
          />
        )}

        <div className="flex-1" />

        {/* Reply input */}
        <div className="flex items-center gap-1 relative" ref={emojiRef}>
          <textarea
            ref={replyRef}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() }
            }}
            placeholder="Reply..."
            className="text-[11px] bg-secondary/40 border border-border rounded px-2 py-1 resize-none w-[120px] max-h-[60px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            style={{ fontFamily: 'var(--font-jetbrains)' }}
            rows={1}
          />

          {/* Emoji button */}
          <button
            onClick={() => setEmojiOpen(!emojiOpen)}
            className="text-sm hover:scale-110 transition-transform"
          >
            {'\u{1F600}'}
          </button>

          {/* Emoji picker */}
          {emojiOpen && (
            <div className="glass absolute bottom-full right-0 mb-1 rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-lg">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => {
                    setReplyText(prev => prev + e)
                    setEmojiOpen(false)
                    replyRef.current?.focus()
                  }}
                  className="text-sm hover:scale-125 transition-transform w-7 h-7 flex items-center justify-center rounded hover:bg-secondary/60"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Send reply */}
          <button
            onClick={handleReply}
            disabled={!replyText.trim()}
            className="text-xs font-bold text-white px-2 py-1 rounded disabled:opacity-30 transition-all hover:brightness-110"
            style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-jetbrains)' }}
          >
            {'\u2191'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ label, active, danger, onClick }: {
  label: string; active?: boolean; danger?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
        danger
          ? active ? 'text-white bg-[var(--d360-red)]' : 'text-muted-foreground hover:text-[var(--d360-red)]'
          : active ? 'text-[var(--d360-orange)]' : 'text-muted-foreground hover:text-foreground'
      }`}
      style={{ fontFamily: 'var(--font-jetbrains)' }}
    >
      {label}
    </button>
  )
}
