'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { formatTimestamp } from '@/lib/date-helpers'
import { EMOJIS } from '@/lib/types'
import {
  CornerDownLeft,
  Pin,
  ThumbsUp,
  Forward,
  Trash2,
  SmilePlus,
  Send,
  Reply,
} from 'lucide-react'
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
  const [showReplyInput, setShowReplyInput] = useState(false)
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  const isSelf = msg.user_id === store.user?.id || msg.sender_id === store.user?.id
  const isPinned = !!store.pinnedMessages[msg.id]
  const isAlertMsg = store.alertWords.some(w => msg.text?.toLowerCase().includes(w.toLowerCase()))
  const compact = store.compact

  // Draft persistence
  useEffect(() => {
    const draft = sessionStorage.getItem(`gm_v3_drafts_${msg.id}`)
    if (draft) { setReplyText(draft); setShowReplyInput(true) }
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

  const accentColor = isPinned
    ? 'var(--d360-yellow)'
    : isSelf
      ? 'var(--d360-purple)'
      : msg.group_id
        ? 'var(--d360-orange)'
        : 'var(--d360-cyan)'

  async function handleReply() {
    if (!replyText.trim()) return
    const attachments = [{ type: 'reply', reply_id: msg.id, base_reply_id: msg.id }]
    await store.sendMessage(panelIdx, replyText.trim(), attachments)
    setReplyText('')
    setShowReplyInput(false)
    sessionStorage.removeItem(`gm_v3_drafts_${msg.id}`)
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await store.deleteMessage(msg.group_id || '', msg.id)
    setConfirmDelete(false)
  }

  /* ======================================= */
  /*  COMPACT MODE - Futuristic chat bubbles */
  /* ======================================= */
  if (compact) {
    return (
      <div
        id={`msg-${msg.id}`}
        className="group/msg relative flex gap-2 items-start py-[3px] px-1"
      >
        {/* Accent dot */}
        <div className="mt-[7px] shrink-0">
          <div
            className="w-[6px] h-[6px] rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
          />
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Reply-to indicator */}
          {replyAttachment && (
            <button
              onClick={() => onScrollToMsg?.(replyAttachment.reply_id || '')}
              className="flex items-center gap-1 text-[9px] text-muted-foreground/60 hover:text-[var(--d360-orange)] -mb-0.5"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <CornerDownLeft className="w-2.5 h-2.5" />
              <span>reply</span>
            </button>
          )}

          {/* Single-line message row */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            {/* Sender */}
            <button
              onClick={() => {
                const uid = msg.user_id || msg.sender_id
                if (uid && uid !== store.user?.id) store.switchView('dm', uid)
              }}
              className="text-[10px] font-bold uppercase tracking-wide shrink-0 hover:underline decoration-1 underline-offset-2"
              style={{ fontFamily: 'var(--font-mono)', color: accentColor }}
            >
              {msg.name}
            </button>

            {/* Group tag */}
            {showGroupTag && groupName && (
              <button
                onClick={() => store.switchView('group', msg.group_id || '')}
                className="text-[8px] px-1 py-[1px] rounded bg-secondary/50 text-muted-foreground/60 hover:text-foreground truncate max-w-[80px] shrink-0"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {groupName}
              </button>
            )}

            {/* Text body */}
            {msg.text && (
              <span
                className={`text-[11px] text-foreground/90 break-words min-w-0 ${
                  isAlertMsg ? 'text-[var(--d360-red)] font-semibold' : ''
                }`}
              >
                {msg.text}
              </span>
            )}

            {/* Timestamp */}
            <span
              className="text-[8px] text-muted-foreground/40 shrink-0 ml-auto tabular-nums"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatTimestamp(msg.created_at)}
            </span>
          </div>

          {/* Compact image row */}
          {imageAttachments.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {imageAttachments.map((att, i) => (
                <img
                  key={i}
                  src={att.url}
                  alt="Attachment"
                  className="w-16 h-12 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity border border-border/30"
                  onClick={() => store.setLightboxUrl(att.url || '')}
                />
              ))}
            </div>
          )}

          {/* Likes (inline) */}
          {likeNames.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <ThumbsUp className="w-2.5 h-2.5 text-muted-foreground/40" />
              <span className="text-[9px] text-muted-foreground/50" style={{ fontFamily: 'var(--font-mono)' }}>
                {likeNames.length}
              </span>
            </div>
          )}

          {/* Compact reply input (toggled) */}
          {showReplyInput && (
            <div className="flex items-center gap-1 mt-1 relative" ref={emojiRef}>
              <textarea
                ref={replyRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() }
                  if (e.key === 'Escape') { setShowReplyInput(false) }
                }}
                placeholder="Reply..."
                className="flex-1 text-[10px] bg-secondary/30 border border-border/50 rounded-lg px-2 py-1 resize-none max-h-[48px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
                style={{ fontFamily: 'var(--font-mono)' }}
                rows={1}
                autoFocus
              />
              <button onClick={() => setEmojiOpen(!emojiOpen)} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
              {emojiOpen && (
                <div className="absolute bottom-full right-0 mb-1 rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-lg bg-card border border-border">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => { setReplyText(prev => prev + e); setEmojiOpen(false); replyRef.current?.focus() }}
                      className="text-sm hover:scale-125 transition-transform w-6 h-6 flex items-center justify-center rounded hover:bg-secondary/60"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="p-1 rounded text-white disabled:opacity-20 transition-all hover:brightness-110"
                style={{ background: 'var(--d360-gradient)' }}
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Hover action tray */}
        <div
          className="absolute right-1 top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5 bg-card/95 border border-border/40 rounded-lg px-1 py-0.5 shadow-md z-10"
        >
          <CompactAction
            Icon={Reply}
            title="Reply"
            onClick={() => { setShowReplyInput(!showReplyInput); setTimeout(() => replyRef.current?.focus(), 50) }}
          />
          <CompactAction
            Icon={ThumbsUp}
            title="Like"
            active={likedBy.includes(store.user?.id || '')}
            onClick={() => {
              const gid = msg.group_id || ''
              if (likedBy.includes(store.user?.id || '')) store.unlikeMessage(gid, msg.id)
              else store.likeMessage(gid, msg.id)
            }}
          />
          <CompactAction
            Icon={Pin}
            title="Pin"
            active={isPinned}
            onClick={() => store.togglePinMessage(msg.id)}
          />
          <CompactAction
            Icon={Forward}
            title="Forward"
            onClick={() => store.setForwardMsg({ id: msg.id, name: msg.name, text: msg.text || '', groupId: msg.group_id })}
          />
          {isSelf && (
            <CompactAction
              Icon={Trash2}
              title={confirmDelete ? 'Confirm?' : 'Delete'}
              danger
              active={confirmDelete}
              onClick={handleDelete}
            />
          )}
        </div>
      </div>
    )
  }

  /* ======================================= */
  /*  STANDARD MODE - Card layout             */
  /* ======================================= */

  const bgClass = isPinned
    ? 'bg-[rgba(255,204,0,0.06)]'
    : isSelf
      ? 'bg-[rgba(167,139,250,0.06)]'
      : ''

  return (
    <div
      id={`msg-${msg.id}`}
      className={`relative rounded-lg border-l-[3px] ${bgClass} px-3 py-2 transition-all hover:bg-secondary/30`}
      style={{
        borderLeftColor: accentColor,
        background: isPinned ? 'rgba(255,204,0,0.04)' : undefined,
      }}
    >
      {/* Pinned indicator */}
      {isPinned && (
        <div className="absolute top-1.5 right-2">
          <Pin className="w-3 h-3 text-[var(--d360-yellow)]" />
        </div>
      )}

      {/* Reply indicator */}
      {replyAttachment && (
        <button
          onClick={() => onScrollToMsg?.(replyAttachment.reply_id || '')}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[var(--d360-orange)] mb-1"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <CornerDownLeft className="w-3 h-3" />
          <span>Reply</span>
        </button>
      )}

      {/* Header row */}
      <div className="flex items-center gap-2 mb-1">
        {/* Avatar */}
        {msg.avatar_url ? (
          <img src={msg.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{ background: 'var(--d360-glass)', color: accentColor }}
          >
            {msg.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* Sender name */}
        <button
          onClick={() => {
            const uid = msg.user_id || msg.sender_id
            if (uid && uid !== store.user?.id) store.switchView('dm', uid)
          }}
          className="text-[11px] uppercase tracking-wider font-semibold text-foreground hover:text-[var(--d360-orange)] transition-colors truncate"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {msg.name}
        </button>

        {/* Group tag badge */}
        {showGroupTag && groupName && (
          <button
            onClick={() => store.switchView('group', msg.group_id || '')}
            className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {groupName}
          </button>
        )}

        <span className="flex-1" />

        {/* Timestamp */}
        <span
          className="text-[9px] text-muted-foreground shrink-0"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatTimestamp(msg.created_at)}
        </span>
      </div>

      {/* Body text */}
      {msg.text && (
        <div
          className={`whitespace-pre-wrap break-words text-sm text-foreground ${
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
            />
          ))}
        </div>
      )}

      {/* Likes row */}
      {likeNames.length > 0 && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
          <ThumbsUp className="w-3 h-3" />
          <span>{likeNames.join(', ')}</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-2 flex-wrap">
        {/* Like */}
        <ActionBtn
          Icon={ThumbsUp}
          label={likedBy.length > 0 ? `${likedBy.length}` : undefined}
          active={likedBy.includes(store.user?.id || '')}
          onClick={() => {
            const gid = msg.group_id || ''
            if (likedBy.includes(store.user?.id || '')) store.unlikeMessage(gid, msg.id)
            else store.likeMessage(gid, msg.id)
          }}
        />

        {/* Pin */}
        <ActionBtn Icon={Pin} active={isPinned} onClick={() => store.togglePinMessage(msg.id)} />

        {/* Forward */}
        <ActionBtn
          Icon={Forward}
          label="FWD"
          onClick={() => store.setForwardMsg({ id: msg.id, name: msg.name, text: msg.text || '', groupId: msg.group_id })}
        />

        {/* Delete (self only) */}
        {isSelf && (
          <ActionBtn
            Icon={Trash2}
            label={confirmDelete ? 'CONFIRM?' : undefined}
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
            className="text-[11px] bg-secondary/40 border border-border rounded-lg px-2 py-1 resize-none w-[120px] max-h-[60px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
            style={{ fontFamily: 'var(--font-mono)' }}
            rows={1}
          />

          {/* Emoji button */}
          <button
            onClick={() => setEmojiOpen(!emojiOpen)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SmilePlus className="w-4 h-4" />
          </button>

          {/* Emoji picker */}
          {emojiOpen && (
            <div className="absolute bottom-full right-0 mb-1 rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-lg bg-card border border-border">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setReplyText(prev => prev + e); setEmojiOpen(false); replyRef.current?.focus() }}
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
            className="p-1.5 rounded-lg text-white disabled:opacity-30 transition-all hover:brightness-110"
            style={{ background: 'var(--d360-gradient)' }}
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

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
      className={`p-[3px] rounded transition-colors ${
        danger
          ? active ? 'text-[var(--d360-red)]' : 'text-muted-foreground/40 hover:text-[var(--d360-red)]'
          : active ? 'text-[var(--d360-orange)]' : 'text-muted-foreground/40 hover:text-foreground'
      }`}
    >
      <Icon className="w-3 h-3" />
    </button>
  )
}

function ActionBtn({ Icon, label, active, danger, onClick }: {
  Icon: typeof Pin
  label?: string
  active?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
        danger
          ? active ? 'text-white bg-[var(--d360-red)]' : 'text-muted-foreground hover:text-[var(--d360-red)]'
          : active ? 'text-[var(--d360-orange)]' : 'text-muted-foreground hover:text-foreground'
      }`}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <Icon className="w-3 h-3" />
      {label && <span>{label}</span>}
    </button>
  )
}
