'use client'

import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/groupme-api'
import { storage } from '@/lib/storage'
import { X, RefreshCw, Users, MessageCircle, Search, Check, Loader2, UserPlus, Trash2, ChevronDown } from 'lucide-react'

interface ShiftProfile {
  name: string
  phone: string
}

export function ShiftChangeModal() {
  const store = useStore()
  const [outgoing, setOutgoing] = useState(store.user?.name || '')
  const [incoming, setIncoming] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDMs, setSelectedDMs] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('')

  // Profiles
  const [profiles, setProfiles] = useState<ShiftProfile[]>([])
  const [showProfiles, setShowProfiles] = useState(false)
  const [editingProfiles, setEditingProfiles] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    setProfiles(storage.getShiftProfiles())
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') store.setShiftChangeOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [store])

  const message = `\u{1F4CB} SHIFT CHANGE\n${outgoing} is going off shift.\n${incoming} is now on dispatch \u2014 ${phone}.`

  const filteredGroups = useMemo(
    () => store.groups.filter(g => g.name.toLowerCase().includes(filter.toLowerCase())),
    [store.groups, filter]
  )
  const approvedDms = store.dmChats.filter(d => store.approved[d.other_user?.id] !== false)
  const filteredDMs = useMemo(
    () => approvedDms.filter(d => d.other_user.name.toLowerCase().includes(filter.toLowerCase())),
    [approvedDms, filter]
  )

  function selectProfile(p: ShiftProfile) {
    setIncoming(p.name)
    setPhone(p.phone)
    setShowProfiles(false)
  }

  function saveProfile() {
    if (!newName.trim()) return
    const updated = [...profiles, { name: newName.trim(), phone: newPhone.trim() }]
    setProfiles(updated)
    storage.setShiftProfiles(updated)
    setNewName('')
    setNewPhone('')
  }

  function deleteProfile(idx: number) {
    const updated = profiles.filter((_, i) => i !== idx)
    setProfiles(updated)
    storage.setShiftProfiles(updated)
  }

  function saveCurrentAsProfile() {
    if (!incoming.trim()) return
    const exists = profiles.some(p => p.name.toLowerCase() === incoming.trim().toLowerCase())
    if (exists) return
    const updated = [...profiles, { name: incoming.trim(), phone: phone.trim() }]
    setProfiles(updated)
    storage.setShiftProfiles(updated)
    store.showToast('Profile Saved', `${incoming.trim()} added to shift profiles`)
  }

  function toggleGroup(id: string) {
    setSelectedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleDM(id: string) {
    setSelectedDMs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (!incoming.trim() || (selectedGroups.size === 0 && selectedDMs.size === 0)) return
    setSending(true)

    const groupPromises = Array.from(selectedGroups).map(gid =>
      api.sendGroupMessage(gid, message).catch(() => null)
    )
    const dmPromises = Array.from(selectedDMs).map(uid =>
      api.sendDM(uid, message).catch(() => null)
    )

    await Promise.all([...groupPromises, ...dmPromises])
    store.showToast('Shift Change', 'Sent successfully')
    setSending(false)
    store.setShiftChangeOpen(false)
  }

  const totalSelected = selectedGroups.size + selectedDMs.size

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => store.setShiftChangeOpen(false)} />
      <div className="relative w-full max-w-lg h-[min(85vh,680px)] mx-4 rounded-xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--d360-orange)]" />
            <h2 className="text-xs uppercase tracking-widest text-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Shift Change
            </h2>
          </div>
          <button onClick={() => store.setShiftChangeOpen(false)} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {/* Outgoing */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Outgoing Dispatcher
            </label>
            <input
              value={outgoing}
              onChange={e => setOutgoing(e.target.value)}
              placeholder="Your name"
              className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* Incoming -- with profile picker */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                Incoming Dispatcher
              </label>
              <div className="flex items-center gap-1">
                {incoming.trim() && !profiles.some(p => p.name.toLowerCase() === incoming.trim().toLowerCase()) && (
                  <button
                    onClick={saveCurrentAsProfile}
                    className="text-[8px] uppercase tracking-widest text-[var(--d360-orange)] hover:brightness-125 transition-colors flex items-center gap-0.5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    title="Save as profile"
                  >
                    <UserPlus className="w-2.5 h-2.5" />
                    Save
                  </button>
                )}
                <button
                  onClick={() => { setShowProfiles(!showProfiles); setEditingProfiles(false) }}
                  className="text-[8px] uppercase tracking-widest text-[var(--d360-orange)] hover:brightness-125 transition-colors flex items-center gap-0.5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showProfiles ? 'rotate-180' : ''}`} />
                  Profiles
                </button>
              </div>
            </div>

            {/* Profile dropdown */}
            {showProfiles && (
              <div className="rounded-lg border border-border bg-secondary/20 overflow-hidden mb-1">
                {/* Existing profiles */}
                {profiles.length > 0 ? (
                  <div className="max-h-[120px] overflow-y-auto">
                    {profiles.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 hover:bg-secondary/40 transition-colors border-b border-border/50 last:border-b-0 cursor-pointer group/prof"
                        onClick={() => !editingProfiles && selectProfile(p)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                            {p.name}
                          </div>
                          {p.phone && (
                            <div className="text-[9px] text-muted-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                              {p.phone}
                            </div>
                          )}
                        </div>
                        {editingProfiles ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteProfile(i) }}
                            className="p-1 rounded hover:bg-destructive/20 text-destructive shrink-0 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        ) : (
                          <Check className="w-3 h-3 text-muted-foreground/30 group-hover/prof:text-[var(--d360-orange)] shrink-0 transition-colors" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-center text-[10px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                    No saved profiles yet
                  </div>
                )}

                {/* Add new / manage */}
                <div className="border-t border-border px-3 py-2 space-y-1.5 bg-secondary/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                      Add New Profile
                    </span>
                    {profiles.length > 0 && (
                      <button
                        onClick={() => setEditingProfiles(!editingProfiles)}
                        className={`text-[8px] uppercase tracking-widest transition-colors ${editingProfiles ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {editingProfiles ? 'Done' : 'Manage'}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Name"
                      className="flex-1 text-[10px] bg-secondary/30 border border-border rounded-lg px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                    <input
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="Phone"
                      className="flex-1 text-[10px] bg-secondary/30 border border-border rounded-lg px-2 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      onKeyDown={e => { if (e.key === 'Enter') saveProfile() }}
                    />
                    <button
                      onClick={saveProfile}
                      disabled={!newName.trim()}
                      className="text-[9px] uppercase tracking-widest px-2 py-1 rounded-lg text-white hover:brightness-110 disabled:opacity-30 transition-all shrink-0"
                      style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input
              value={incoming}
              onChange={e => setIncoming(e.target.value)}
              placeholder="Incoming dispatcher name"
              className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-mono)' }}
              autoFocus
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Phone Number
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Contact number"
              className="w-full text-xs bg-secondary/30 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* Preview */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Preview
            </label>
            <div
              className="text-[10px] text-muted-foreground bg-secondary/20 border border-border/50 rounded-lg p-2.5 whitespace-pre-wrap"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {message}
            </div>
          </div>

          {/* Recipients */}
          <div className="flex items-center justify-between">
            <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              Recipients ({totalSelected})
            </label>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter recipients..."
              className="w-full text-xs bg-secondary/30 border border-border rounded-lg pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--d360-orange)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* Recipient list */}
          <div className="rounded-lg border border-border bg-secondary/20 overflow-hidden max-h-[180px] overflow-y-auto">
            {/* Groups */}
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground px-3 py-1.5 bg-secondary/10" style={{ fontFamily: 'var(--font-mono)' }}>
              <Users className="w-3 h-3" />
              Groups
            </div>
            {filteredGroups.map(g => {
              const isSelected = selectedGroups.has(g.id)
              return (
                <label
                  key={g.id}
                  className={`flex items-center gap-2.5 text-xs cursor-pointer px-3 py-1.5 transition-colors border-b border-border/30 ${
                    isSelected ? 'bg-[var(--d360-orange)]/10' : 'hover:bg-secondary/40'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-[var(--d360-orange)] border-[var(--d360-orange)]' : 'border-border bg-secondary/30'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>{g.name}</span>
                </label>
              )
            })}

            {/* DMs */}
            {filteredDMs.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground px-3 py-1.5 bg-secondary/10" style={{ fontFamily: 'var(--font-mono)' }}>
                  <MessageCircle className="w-3 h-3" />
                  DMs
                </div>
                {filteredDMs.map(d => {
                  const isSelected = selectedDMs.has(d.other_user.id)
                  return (
                    <label
                      key={d.other_user.id}
                      className={`flex items-center gap-2.5 text-xs cursor-pointer px-3 py-1.5 transition-colors border-b border-border/30 ${
                        isSelected ? 'bg-[var(--d360-orange)]/10' : 'hover:bg-secondary/40'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-[var(--d360-orange)] border-[var(--d360-orange)]' : 'border-border bg-secondary/30'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-foreground truncate" style={{ fontFamily: 'var(--font-mono)' }}>{d.other_user.name}</span>
                    </label>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* Send button */}
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={handleSend}
            disabled={!incoming.trim() || totalSelected === 0 || sending}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-white py-2.5 rounded-lg disabled:opacity-30 transition-all hover:brightness-110"
            style={{ background: 'var(--d360-gradient)', fontFamily: 'var(--font-mono)' }}
          >
            {sending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                {`Send Shift Change to ${totalSelected} recipient${totalSelected !== 1 ? 's' : ''}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
