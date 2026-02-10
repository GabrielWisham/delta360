'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { storage } from '@/lib/storage'
import { X } from 'lucide-react'

export function FloatingClipboard() {
  const store = useStore()
  const [content, setContent] = useState('')
  const [pos, setPos] = useState({ x: 100, y: 100 })
  const [dragging, setDragging] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Load persisted state
  useEffect(() => {
    setContent(storage.getClipboard())
    setPos(storage.getClipboardPos())
  }, [])

  // Keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'c' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        store.setClipboardOpen(!store.clipboardOpen)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [store])

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
      className="fixed z-50 w-[280px] rounded-xl overflow-hidden shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
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
          className="w-full h-[150px] text-xs bg-secondary/30 border border-border rounded-lg px-2 py-1.5 resize-y text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
          style={{ fontFamily: 'var(--font-jetbrains)' }}
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
    </div>
  )
}
