/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

type ImageItem = {
  id: string
  url: string
}

export default function VehicleImageGallery({ images, alt }: { images: ImageItem[]; alt: string }) {
  const ordered = useMemo(() => images ?? [], [images])
  const [activeUrl, setActiveUrl] = useState<string | null>(ordered[0]?.url ?? null)
  const [isOpen, setIsOpen] = useState(false)

  const active = activeUrl ?? ordered[0]?.url ?? null
  const canOpen = Boolean(active)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  return (
    <div>
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => setIsOpen(true)}
        className={`aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4 shadow-sm relative w-full ${
          canOpen ? 'cursor-zoom-in' : ''
        }`}
      >
        {active ? (
          <img
            src={active}
            alt={alt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">Sin imagen</div>
        )}
      </button>

      {ordered.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {ordered.map((img) => {
            const isActive = img.url === active
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveUrl(img.url)}
                className={`relative aspect-video rounded overflow-hidden cursor-pointer transition ${
                  isActive ? 'ring-2 ring-green-600' : 'hover:opacity-80'
                }`}
              >
                <img
                  src={img.url}
                  alt={alt}
                  className="w-full h-full object-cover"
                />
              </button>
            )
          })}
        </div>
      )}

      {isOpen && active && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-4 py-6"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-[min(95vw,1200px)] h-[min(90vh,800px)] bg-black rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 z-10 inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={active} alt={alt} className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
