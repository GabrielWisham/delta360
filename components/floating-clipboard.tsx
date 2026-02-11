'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { storage } from '@/lib/storage'
import { X } from 'lucide-react'

export function FloatingClipboard() {
const store = useStore()
const [content, setContent] = useState('')
const [pos, setPos] = useState({ x: 100, y: 100 })
const [size, setSize] = useState({ w: 280, h: 200 })
const [dragging, setDragging] = useState(false)
const [resizing, setResizing] = useState(false)
const [confirmClear, setConfirmClear] = useState(false)
const dragOffset = useRef({ x: 0, y: 0 })
const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
const containerRef = useRef<HTMLDivElement>(null)

// Load persisted state
useEffect(() => {
setContent(storage.getClipboard())
setPos(storage.getClipboardPos())
// Load saved size if available
try {
  const saved = localStorage.getItem('gm_v3_cbsize')
  if (saved) { const s = JSON.parse(saved); setSize(s) }
} catch { /* ignore */ }
}, [])

  // Open/close shortcut handled centrally in dispatch-app

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
    setDragging(true)
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    }
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    function handleMove(e: MouseEvent) {
      const newPos = {
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      }
      setPos(newPos)
    }
    function handleUp() {
      setDragging(false)
      storage.setClipboardPos(pos)
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [dragging, pos])

  // Resize handler
const handleResizeStart = useCallback((e: React.MouseEvent) => {
e.preventDefault()
e.stopPropagation()
setResizing(true)
resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }
}, [size])

useEffect(() => {
if (!resizing) return
function handleMove(e: MouseEvent) {
  const dx = e.clientX - resizeStart.current.x
  const dy = e.clientY - resizeStart.current.y
  const newW = Math.max(200, Math.min(600, resizeStart.current.w + dx))
  const newH = Math.max(120, Math.min(500, resizeStart.current.h + dy))
  setSize({ w: newW, h: newH })
}
function handleUp() {
  setResizing(false)
  try { localStorage.setItem('gm_v3_cbsize', JSON.stringify(size)) } catch { /* ignore */ }
}
document.addEventListener('mousemove', handleMove)
document.addEventListener('mouseup', handleUp)
return () => {
  document.removeEventListener('mousemove', handleMove)
  document.removeEventListener('mouseup', handleUp)
}
}, [resizing, size])

if (!store.clipboardOpen) return null

  function handleContentChange(val: string) {
    setContent(val)
    storage.setClipboard(val)
  }

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return }
    setContent('')
    storage.setClipboard('')
    setConfirmClear(false)
  }

  return (
    <div
    ref={containerRef}
    className="fixed z-50 rounded-xl overflow-hidden shadow-2xl"
    style={{ left: pos.x, top: pos.y, width: size.w }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-2 cursor-move select-none text-white"
        style={{ background: 'var(--d360-gradient)' }}
      >
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-jetbrains)' }}>
          Clipboard
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] opacity-70">{content.length} chars</span>
          <button
            onClick={() => store.setClipboardOpen(false)}
            className="hover:opacity-70"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card border border-border border-t-0 rounded-b-xl p-2">
    <textarea
    value={content}
    onChange={e => handleContentChange(e.target.value)}
    className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-2 py-1.5 resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
    style={{ fontFamily: 'var(--font-jetbrains)', height: size.h - 50 }}
    placeholder="Paste or type notes..."
    />
    <div className="flex justify-end mt-1">
    <button
    onClick={handleClear}
    className={`text-[10px] px-2 py-0.5 rounded ${
    confirmClear
    ? 'text-white bg-[var(--d360-red)]'
    : 'text-muted-foreground hover:text-[var(--d360-red)]'
    }`}
    style={{ fontFamily: 'var(--font-jetbrains)' }}
    >
    {confirmClear ? 'Confirm Clear' : 'Clear'}
    </button>
    </div>
    </div>
    {/* Resize handle */}
    <div
    onMouseDown={handleResizeStart}
    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
    style={{ touchAction: 'none' }}
    >
    <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
    <path d="M14 14L8 14L14 8Z" fill="currentColor" />
    <path d="M14 14L11 14L14 11Z" fill="currentColor" opacity="0.5" />
    </svg>
    </div>
    </div>
  )
}
