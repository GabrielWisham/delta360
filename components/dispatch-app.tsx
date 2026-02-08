'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { resumeAudio } from '@/lib/sounds'
import { LoginScreen } from './login-screen'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { MessageFeed } from './message-feed'
import { ConfigPanel } from './config-panel'
import { SearchPanel } from './search-panel'
import { StickyNotes } from './sticky-notes'
import { MembersPanel } from './members-panel'
import { ContactsPanel } from './contacts-panel'
import { FloatingClipboard } from './floating-clipboard'
import { ForwardModal } from './forward-modal'
import { BroadcastModal } from './broadcast-modal'
import { ShiftChangeModal } from './shift-change-modal'
import { ToastZone } from './toast-zone'
import { Lightbox } from './lightbox'

export function DispatchApp() {
  const store = useStore()
  const audioResumed = useRef(false)

  // Resume AudioContext on very first user interaction
  useEffect(() => {
    function handleInteraction() {
      if (!audioResumed.current) {
        resumeAudio()
        audioResumed.current = true
      }
    }
    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('keydown', handleInteraction, { once: true })
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  if (!store.isLoggedIn) {
    return <LoginScreen />
  }

  // Determine how many panels to show
  const secondaryPanels = [store.panels[1], store.panels[2]].filter(Boolean)
  const maxSecondary = store.sidebarCollapsed ? 2 : 1
  const visibleSecondary = secondaryPanels.slice(0, maxSecondary)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Config panel (slides down) */}
          <ConfigPanel />

          {/* Sticky notes bar */}
          <StickyNotes />

          {/* Panel area */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Primary panel (always visible) */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 border-r border-border relative">
              <MessageFeed panelIdx={0} />
              <SearchPanel />
            </div>

            {/* Secondary panels */}
            {visibleSecondary.map((panel, i) => {
              if (!panel) return null
              const slotIdx = i === 0 ? 1 : 2
              return (
                <div
                  key={slotIdx}
                  className="flex-1 flex flex-col min-h-0 min-w-0 border-r border-border"
                >
                  <MessageFeed panelIdx={slotIdx} />
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Floating & Modal overlays */}
      <FloatingClipboard />
      <MembersPanel />
      <ContactsPanel />
      <ForwardModal />
      <BroadcastModal />
      <ShiftChangeModal />
      <Lightbox />
      <ToastZone />
    </div>
  )
}
