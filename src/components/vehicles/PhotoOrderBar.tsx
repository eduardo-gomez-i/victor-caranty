'use client'

import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

// Mueve un elemento de la lista a otra posición (la primera foto es la principal)
export function moveItem<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// Barra inferior de cada miniatura: mover a la izquierda/derecha y elegir la foto principal
export default function PhotoOrderBar({
  index,
  total,
  onMove,
}: {
  index: number
  total: number
  onMove: (from: number, to: number) => void
}) {
  const btn = 'flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/20 disabled:opacity-30'
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-1 py-0.5 text-xs text-white">
      <button type="button" className={btn} onClick={() => onMove(index, index - 1)} disabled={index === 0} aria-label="Mover a la izquierda">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {index === 0 ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          Principal
        </span>
      ) : (
        <button type="button" onClick={() => onMove(index, 0)} className={btn} aria-label="Hacer foto principal" title="Hacer foto principal">
          <Star className="h-4 w-4" />
        </button>
      )}
      <button type="button" className={btn} onClick={() => onMove(index, index + 1)} disabled={index === total - 1} aria-label="Mover a la derecha">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
