'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import type { PhotoAiState } from '@/app/api/photos/status/route'

type PhotoAi = Record<string, { state: PhotoAiState; editedUrl?: string }>

const POLL_MS = 4000

// Sigue la edición con IA de las fotos subidas en el formulario (arranca al subirlas).
export function usePhotoAi(urls: string[]) {
  const [photos, setPhotos] = useState<PhotoAi>({})
  const [enabled, setEnabled] = useState(true)
  const key = urls.join('|')

  useEffect(() => {
    if (urls.length === 0 || !enabled) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      try {
        const res = await fetch('/api/photos/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls }),
        })
        if (cancelled) return
        // Sin estado no se puede esperar a la IA: no bloquear la publicación
        if (!res.ok) {
          setEnabled(false)
          return
        }
        const data = (await res.json()) as { enabled: boolean; photos: PhotoAi }
        if (cancelled) return
        if (!data.enabled) {
          setEnabled(false)
          return
        }
        setPhotos(data.photos)
        if (Object.values(data.photos).some((p) => p.state === 'processing')) timer = setTimeout(poll, POLL_MS)
      } catch {
        if (!cancelled) timer = setTimeout(poll, POLL_MS * 2)
      }
    }
    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  const processing = enabled ? urls.filter((u) => (photos[u]?.state ?? 'processing') === 'processing').length : 0
  return { photos, processing, enabled }
}

// Etiqueta sobre la miniatura: procesando, editada o en revisión
export function PhotoAiBadge({ state }: { state?: PhotoAiState }) {
  if (state === 'processing' || state === undefined) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-xs font-medium text-white">
        <Loader2 className="h-5 w-5 animate-spin" />
        Editando con IA…
      </div>
    )
  }
  if (state === 'edited') {
    return (
      <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-800">
        <Sparkles className="h-3 w-3 text-primary" />
        Editada con IA
      </span>
    )
  }
  if (state === 'removed') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-2 text-center text-xs font-medium text-white">
        No corresponde al auto: se eliminará
      </div>
    )
  }
  if (state === 'review') {
    return (
      <span className="absolute left-1 top-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
        La revisará un administrador
      </span>
    )
  }
  return null
}

// Aviso junto al botón de publicar mientras la IA edita las fotos (no bloquea la publicación)
export function PhotoAiProgress({ processing, total }: { processing: number; total: number }) {
  return (
    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <p className="flex items-center gap-2 font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Editando fotos con IA: {total - processing} de {total} listas
      </p>
      <p className="mt-1">
        Puedes publicar ya: las fotos se terminan de editar en segundo plano y tu anuncio será visible para el público en cuanto estén listas.
      </p>
    </div>
  )
}
