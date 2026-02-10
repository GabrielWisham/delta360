'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import {
  X, Copy, Check, Trash2, Plus, GripVertical, ChevronDown, ChevronUp,
  Save, FolderOpen, RotateCcw, Truck,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LoadData {
  id: string
  timeCategory: string
  customTime: string
  orderNumber: string
  notes: string
  pickUp: string
  account: string
  product: string
  gallons: string
  deliveryTo: string
  address: string
  locationWell: string
  city: string
  gps: string
  directions: string
  collapsed: boolean
}

interface FormData {
  driverName: string
  date: string
  loads: LoadData[]
}

interface Template {
  name: string
  loads: Omit<LoadData, 'id' | 'collapsed'>[]
}

const TIME_CATEGORIES = ['Anytime', 'Morning', 'Midday', 'Evening', 'Night']
const STORAGE_KEY = 'gm_v3_msg_builder'
const TEMPLATE_KEY = 'gm_v3_msg_templates'

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

function emptyLoad(): LoadData {
  return {
    id: makeId(),
    timeCategory: 'Anytime',
    customTime: '',
    orderNumber: '',
    notes: '',
    pickUp: '',
    account: '',
    product: '',
    gallons: '',
    deliveryTo: '',
    address: '',
    locationWell: '',
    city: '',
    gps: '',
    directions: '',
    collapsed: false,
  }
}

function todayStr() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 4 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Good night'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${days[d.getDay()]}, ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function stripEmailed(text: string): string {
  return text.replace(/emailed/gi, '').replace(/\s{2,}/g, ' ').trim()
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MessageBuilder() {
  const store = useStore()
  const [form, setForm] = useState<FormData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch { /* ignore */ }
    }
    return { driverName: '', date: todayStr(), loads: [emptyLoad()] }
  })
  const [copied, setCopied] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateName, setTemplateName] = useState('')
  const [showTemplateSave, setShowTemplateSave] = useState(false)
  const [showTemplateLoad, setShowTemplateLoad] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const formScrollRef = useRef<HTMLDivElement>(null)

  // Hydrate templates
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_KEY)
      if (saved) setTemplates(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  // Persist form
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  // Persist templates
  useEffect(() => {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates))
  }, [templates])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') store.setMsgBuilderOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

  // ── Updaters ──

  function updateField(key: keyof Omit<FormData, 'loads'>, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function updateLoad(idx: number, key: keyof LoadData, val: string | boolean) {
    setForm(prev => {
      const loads = [...prev.loads]
      loads[idx] = { ...loads[idx], [key]: val }
      return { ...prev, loads }
    })
  }

  function addLoad() {
    if (form.loads.length >= 7) return
    setForm(prev => ({ ...prev, loads: [...prev.loads, emptyLoad()] }))
    setTimeout(() => formScrollRef.current?.scrollTo({ top: formScrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }

  function removeLoad(idx: number) {
    setForm(prev => ({ ...prev, loads: prev.loads.filter((_, i) => i !== idx) }))
  }

  function clearAll() {
    setForm({ driverName: '', date: todayStr(), loads: [emptyLoad()] })
  }

  // ── Drag & Drop (mouse + touch) ──

  const touchStartY = useRef<number>(0)
  const touchDragIdx = useRef<number | null>(null)

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setOverIdx(idx)
  }

  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return }
    reorderLoads(dragIdx, idx)
    setDragIdx(null)
    setOverIdx(null)
  }

  function handleDragEnd() {
    setDragIdx(null)
    setOverIdx(null)
  }

  function reorderLoads(fromIdx: number, toIdx: number) {
    setForm(prev => {
      const loads = [...prev.loads]
      const [moved] = loads.splice(fromIdx, 1)
      loads.splice(toIdx, 0, moved)
      return { ...prev, loads }
    })
  }

  function handleTouchStart(e: React.TouchEvent, idx: number) {
    touchStartY.current = e.touches[0].clientY
    touchDragIdx.current = idx
    setDragIdx(idx)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchDragIdx.current === null) return
    const touch = e.touches[0]
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY)
    const card = elements.find(el => el.getAttribute('data-load-idx') !== null)
    if (card) {
      const targetIdx = parseInt(card.getAttribute('data-load-idx')!, 10)
      setOverIdx(targetIdx)
    }
  }

  function handleTouchEnd() {
    if (touchDragIdx.current !== null && overIdx !== null && touchDragIdx.current !== overIdx) {
      reorderLoads(touchDragIdx.current, overIdx)
    }
    touchDragIdx.current = null
    setDragIdx(null)
    setOverIdx(null)
  }

  // ── Templates ──

  function saveTemplate() {
    if (!templateName.trim()) return
    const tpl: Template = {
      name: templateName.trim(),
      loads: form.loads.map(({ id, collapsed, ...rest }) => rest),
    }
    setTemplates(prev => [...prev.filter(t => t.name !== tpl.name), tpl])
    setTemplateName('')
    setShowTemplateSave(false)
    store.showToast('Template', `"${tpl.name}" saved`)
  }

  function loadTemplate(tpl: Template) {
    setForm(prev => ({
      ...prev,
      loads: tpl.loads.map(l => ({ ...l, id: makeId(), collapsed: false })),
    }))
    setShowTemplateLoad(false)
    store.showToast('Template', `"${tpl.name}" loaded`)
  }

  function deleteTemplate(name: string) {
    setTemplates(prev => prev.filter(t => t.name !== name))
  }

  // ── Generate message ──

  const generateMessage = useCallback((): string => {
    const { driverName, date, loads } = form
    const first = firstName(driverName || 'Driver')
    const greeting = getGreeting()
    const formattedDate = formatDate(date)
    const divider = '---------------------------------------------------------------------------------'

    let msg = `${greeting}, ${first}! Here is your schedule for ${formattedDate}.\n${divider}`

    loads.forEach((load, i) => {
      const timeDisplay = load.customTime || load.timeCategory
      const notesClean = stripEmailed(load.notes)
      const notesPart = notesClean ? ` (${notesClean})` : ''

      msg += `\n \uD83D\uDE9A Load #${i + 1}: ${timeDisplay}`
      msg += `\nOrder#: ${load.orderNumber}${notesPart}`
      msg += `\n\u2981 Pick Up: ${load.pickUp}`
      msg += `\n\u2981 Acct #: ${load.account}`
      msg += `\n\u2981 Product: ${load.gallons ? `${load.gallons}-gal ` : ''}${load.product}`
      const addr = (load.address || '').trim()
      const gps = (load.gps || '').trim()
      const city = (load.city || '').trim()
      const dirs = (load.directions || '').trim()

      msg += `\n\u2981 Delivery To: ${load.deliveryTo || ''}`
      if (addr) {
        msg += `\n\u2981 Address: ${addr}`
      }
      msg += `\n\u2981 Location/Well: ${load.locationWell || ''}`
      msg += `\n\u2981 City: ${city}`

      if (gps) {
        msg += `\n\u2981 GPS: ${gps}`
        msg += `\n\uD83D\uDCCD Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gps)}`
      } else if (addr) {
        const mapQuery = city ? `${addr}, ${city}` : addr
        msg += `\n\uD83D\uDCCD Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
      }
      if (dirs) {
        msg += `\n Driver Directions: ${dirs}`
      }

      msg += `\n${divider}`
    })

    msg += `\n\nSafe travels, ${first}! Please reach out if you have any requests.`
    return msg
  }, [form])

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(generateMessage())
      setCopied(true)
      store.showToast('Copied', 'Message copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      store.showToast('Error', 'Failed to copy')
    }
  }

  // ── Helpers ──

  const mono = { fontFamily: 'var(--font-mono)' }
  const inputCls = 'w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)] transition-colors'
  const labelCls = 'text-[9px] uppercase tracking-widest text-muted-foreground font-semibold'

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/70" onClick={() => store.setMsgBuilderOpen(false)} />
      <div className="relative w-full h-full flex flex-col lg:flex-row bg-background animate-in fade-in duration-200 overflow-hidden">

        {/* ─── LEFT: Form ─── */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-border">
          {/* Form header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[var(--d360-orange)]" />
              <h2 className="text-xs uppercase tracking-widest text-foreground font-semibold" style={mono}>
                Dispatch Message Builder
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {/* Template actions */}
              <button
                onClick={() => { setShowTemplateSave(!showTemplateSave); setShowTemplateLoad(false) }}
                className={`p-1.5 rounded-lg transition-colors ${showTemplateSave ? 'text-[var(--d360-orange)]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
                title="Save as template"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowTemplateLoad(!showTemplateLoad); setShowTemplateSave(false) }}
                className={`p-1.5 rounded-lg transition-colors ${showTemplateLoad ? 'text-[var(--d360-orange)]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
                title="Load template"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button
                onClick={clearAll}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => store.setMsgBuilderOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Template save bar */}
          {showTemplateSave && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/10 shrink-0">
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Template name..."
                className={`${inputCls} flex-1`}
                style={mono}
                onKeyDown={e => { if (e.key === 'Enter') saveTemplate() }}
                autoFocus
              />
              <button
                onClick={saveTemplate}
                disabled={!templateName.trim()}
                className="text-[9px] uppercase tracking-widest px-3 py-2 rounded-lg text-white hover:brightness-110 disabled:opacity-30 transition-all"
                style={{ background: 'var(--d360-gradient)', ...mono }}
              >
                Save
              </button>
            </div>
          )}

          {/* Template load dropdown */}
          {showTemplateLoad && (
            <div className="border-b border-border bg-secondary/10 shrink-0 max-h-[160px] overflow-y-auto">
              {templates.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground text-center" style={mono}>
                  No saved templates yet.
                </div>
              ) : templates.map(tpl => (
                <div
                  key={tpl.name}
                  className="flex items-center justify-between px-4 py-2 hover:bg-secondary/40 transition-colors group/tpl cursor-pointer"
                  onClick={() => loadTemplate(tpl)}
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground" style={mono}>{tpl.name}</div>
                    <div className="text-[9px] text-muted-foreground" style={mono}>{tpl.loads.length} load{tpl.loads.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteTemplate(tpl.name) }}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover/tpl:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Scrollable form */}
          <div ref={formScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
            {/* Driver + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls} style={mono}>Driver Name</label>
                <input
                  value={form.driverName}
                  onChange={e => updateField('driverName', e.target.value)}
                  placeholder="e.g. John Smith"
                  className={inputCls}
                  style={mono}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls} style={mono}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => updateField('date', e.target.value)}
                  className={inputCls}
                  style={mono}
                />
              </div>
            </div>

            {/* Load cards */}
            {form.loads.map((load, idx) => (
              <div
                key={load.id}
                data-load-idx={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                onTouchStart={e => handleTouchStart(e, idx)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`rounded-xl border bg-card transition-all ${
                  overIdx === idx ? 'border-[var(--d360-orange)] ring-1 ring-[var(--d360-orange)]/30' :
                  dragIdx === idx ? 'opacity-50 border-border' : 'border-border'
                }`}
                style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--d360-orange)' }}
              >
                {/* Card header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--d360-orange)]" style={mono}>
                    Load #{idx + 1}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => updateLoad(idx, 'collapsed', !load.collapsed)}
                    className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {load.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                  {form.loads.length > 1 && (
                    <button
                      onClick={() => removeLoad(idx)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Card body */}
                {!load.collapsed && (
                  <div className="px-3 pb-3 pt-0 space-y-3">
                    {/* Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Time Slot</label>
                        <select
                          value={load.customTime ? '' : load.timeCategory}
                          onChange={e => { updateLoad(idx, 'timeCategory', e.target.value); updateLoad(idx, 'customTime', '') }}
                          className={inputCls}
                          style={mono}
                        >
                          {TIME_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Or Specific Time</label>
                        <input
                          type="time"
                          value={load.customTime}
                          onChange={e => updateLoad(idx, 'customTime', e.target.value)}
                          className={inputCls}
                          style={mono}
                        />
                      </div>
                    </div>

                    {/* Order + Notes */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Order #</label>
                        <input value={load.orderNumber} onChange={e => updateLoad(idx, 'orderNumber', e.target.value)} placeholder="Order number" className={inputCls} style={mono} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Notes</label>
                        <input value={load.notes} onChange={e => updateLoad(idx, 'notes', e.target.value)} placeholder="BOL attached, etc." className={inputCls} style={mono} />
                      </div>
                    </div>

                    {/* Pick Up + Account */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Pick Up Location</label>
                        <input value={load.pickUp} onChange={e => updateLoad(idx, 'pickUp', e.target.value)} placeholder="Terminal name" className={inputCls} style={mono} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Account #</label>
                        <input value={load.account} onChange={e => updateLoad(idx, 'account', e.target.value)} placeholder="Account number" className={inputCls} style={mono} />
                      </div>
                    </div>

                    {/* Product + Gallons */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Product</label>
                        <input value={load.product} onChange={e => updateLoad(idx, 'product', e.target.value)} placeholder="Diesel, Gasoline..." className={inputCls} style={mono} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Gallons</label>
                        <input type="number" value={load.gallons} onChange={e => updateLoad(idx, 'gallons', e.target.value)} placeholder="8000" className={inputCls} style={mono} />
                      </div>
                    </div>

                    {/* Delivery To + Location */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Delivery To</label>
                        <input value={load.deliveryTo} onChange={e => updateLoad(idx, 'deliveryTo', e.target.value)} placeholder="Company name" className={inputCls} style={mono} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Location / Well</label>
                        <input value={load.locationWell} onChange={e => updateLoad(idx, 'locationWell', e.target.value)} placeholder="Well/site name" className={inputCls} style={mono} />
                      </div>
                    </div>

                    {/* Address + City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Address <span className="text-muted-foreground/60">(street / building)</span></label>
                        <input value={load.address} onChange={e => updateLoad(idx, 'address', e.target.value)} placeholder="1234 Industrial Blvd, Bldg C" className={inputCls} style={mono} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>City</label>
                        <input value={load.city} onChange={e => updateLoad(idx, 'city', e.target.value)} placeholder="City" className={inputCls} style={mono} />
                      </div>
                    </div>

                    {/* GPS + Directions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>GPS Coordinates <span className="text-muted-foreground/60">(auto-links Maps)</span></label>
                        <input value={load.gps} onChange={e => updateLoad(idx, 'gps', e.target.value)} placeholder="31.9686, -99.9018" className={inputCls} style={mono} />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls} style={mono}>Driver Directions <span className="text-muted-foreground/60">(optional)</span></label>
                        <input value={load.directions} onChange={e => updateLoad(idx, 'directions', e.target.value)} placeholder="Turn left after gate..." className={inputCls} style={mono} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add load button */}
            {form.loads.length < 7 && (
              <button
                onClick={addLoad}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:border-[var(--d360-orange)] text-muted-foreground hover:text-[var(--d360-orange)] transition-colors"
                style={mono}
              >
                <Plus className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Add Load ({form.loads.length}/7)</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Preview ─── */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={mono}>
              Live Preview
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold px-3 py-1.5 rounded-lg text-white hover:brightness-110 transition-all"
              style={{ background: 'var(--d360-gradient)', ...mono }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

          {/* Preview body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <pre
              className="text-xs leading-6 text-foreground whitespace-pre-wrap break-words p-4 rounded-xl bg-card border border-border"
              style={mono}
            >
              {generateMessage()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
