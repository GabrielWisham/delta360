'use client'

import { useEffect, useRef, useState } from 'react'
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
import { MessageBuilder } from './message-builder'
import { OrderSearch } from './order-search'
import { ToastZone } from './toast-zone'
import { Lightbox } from './lightbox'
import { OnboardingTutorial } from './onboarding-tutorial'

export function DispatchApp() {
  const store = useStore()
  const audioResumed = useRef(false)
  const [showTutorial, setShowTutorial] = useState(false)

  // Show tutorial on first login
  useEffect(() => {
    if (store.isLoggedIn && !localStorage.getItem('d360_tutorial_done')) {
      const timer = setTimeout(() => setShowTutorial(true), 600)
      return () => clearTimeout(timer)
    }
  }, [store.isLoggedIn])

  // Allow re-opening tutorial from header help icon
  useEffect(() => {
    const handler = () => setShowTutorial(true)
    window.addEventListener('d360:show-tutorial', handler)
    return () => window.removeEventListener('d360:show-tutorial', handler)
  }, [])

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
          {/* Sticky notes bar */}
          <StickyNotes />

          {/* Panel area -- horizontal on landscape/desktop, vertical on portrait/mobile */}
          <div className="flex max-sm:flex-col flex-1 min-h-0 overflow-hidden">
            {/* Primary panel (always visible) */}
            <div className={`flex flex-col min-h-0 min-w-0 border-r max-sm:border-r-0 max-sm:border-b border-border relative ${visibleSecondary.length > 0 ? 'flex-1 max-sm:flex-[2]' : 'flex-1'}`}>
              <MessageFeed panelIdx={0} />
            </div>

            {/* Secondary panels */}
            {visibleSecondary.map((panel, i) => {
              if (!panel) return null
              const slotIdx = i === 0 ? 1 : 2
              return (
                <div
                  key={slotIdx}
                  className="flex-1 flex flex-col min-h-0 min-w-0 border-r max-sm:border-r-0 max-sm:border-b border-border"
                >
                  <MessageFeed panelIdx={slotIdx} />
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Floating & Modal overlays */}
      <SearchPanel />
      {store.configOpen && <ConfigPanel />}
      <FloatingClipboard />
      {store.membersOpen && <MembersPanel />}
      {store.contactsOpen && <ContactsPanel />}
      {store.forwardMsg && <ForwardModal />}
      {store.adhocOpen && <BroadcastModal />}
      {store.shiftChangeOpen && <ShiftChangeModal />}
      {store.msgBuilderOpen && <MessageBuilder />}
      <OrderSearch />
      {store.lightboxUrl && <Lightbox />}
      {showTutorial && <OnboardingTutorial onDismiss={() => setShowTutorial(false)} />}
      <ToastZone />
    </div>
  )
}
