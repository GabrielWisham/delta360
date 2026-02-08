'use client'

import { useStore } from '@/lib/store'

export function Lightbox() {
  const { lightboxUrl, setLightboxUrl } = useStore()
  if (!lightboxUrl) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
      onClick={() => setLightboxUrl(null)}
    >
      <img
        src={lightboxUrl}
        alt="Full size"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}

      />
    </div>
  )
}
