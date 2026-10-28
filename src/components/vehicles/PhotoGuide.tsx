'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Images, Loader2, Upload, X } from 'lucide-react'
import { MIN_PHOTOS } from '@/constants/vehicles'

// Los 12 ángulos recomendados, en el orden en que conviene subirlos (el 1 es la foto principal).
// Las imágenes de ejemplo vienen de /public/brand/guia/angulo-NN.jpg.
// "essential": los MIN_PHOTOS ángulos que no deben faltar (frente, atrás, costados e interior).
const SHOTS = [
  { title: 'Frente 3/4 izquierda', hint: 'El frente y un costado. Será tu foto principal.', essential: true },
  { title: 'Frente directa', hint: 'Todo el frente del auto, centrado.', essential: true },
  { title: 'Frente 3/4 derecha', hint: 'El frente y el otro costado.', essential: false },
  { title: 'Trasera 3/4 izquierda', hint: 'La parte trasera y un costado.', essential: false },
  { title: 'Trasera directa', hint: 'Toda la parte trasera, centrada.', essential: true },
  { title: 'Trasera 3/4 derecha', hint: 'La parte trasera y el otro costado.', essential: false },
  { title: 'Lateral izquierda', hint: 'Todo un costado del auto.', essential: true },
  { title: 'Lateral derecha', hint: 'El otro costado completo.', essential: true },
  { title: 'Interior delantero', hint: 'Volante, tablero y consola.', essential: true },
  { title: 'Asientos delanteros', hint: 'Estado y ajuste de los asientos.', essential: true },
  { title: 'Asientos traseros', hint: 'Estado y espacio de los asientos.', essential: true },
  { title: 'Cajuela', hint: 'Vacía, para mostrar el espacio y su estado.', essential: false },
].map((shot, i) => ({ ...shot, src: `/brand/guia/angulo-${String(i + 1).padStart(2, '0')}.jpg` }))

// Vista previa debajo del título: frente, atrás, costado e interior
const PREVIEW = [
  { label: 'Frente', index: 0 },
  { label: 'Atrás', index: 4 },
  { label: 'Costado', index: 6 },
  { label: 'Interior', index: 8 },
]

const TIPS = [
  'De día y con el sol a tu espalda (no de frente al auto).',
  'Lava y aspira el auto antes: el exterior se publica tal cual.',
  'Fondo despejado, sin personas; saca tus objetos personales.',
  'Celular en horizontal, a la altura de las puertas, con el auto completo.',
  'Muestra también golpes o detalles: genera confianza.',
  'Sin textos, teléfonos, logos ni filtros: el anuncio pasaría a revisión manual.',
  'La placa la cubrimos automáticamente.',
]

interface Props {
  uploaded: number
  uploading?: boolean
  // Abre el selector de archivos del formulario, para subir sin salir de la guía
  onUpload: () => void
}

export default function PhotoGuide({ uploaded, uploading = false, onUpload }: Props) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState<number | null>(null)

  useEffect(() => {
    if (!open && zoom === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoom !== null) setZoom(null)
        else setOpen(false)
      }
      if (zoom !== null && e.key === 'ArrowRight') setZoom((z) => (z! + 1) % SHOTS.length)
      if (zoom !== null && e.key === 'ArrowLeft') setZoom((z) => (z! + SHOTS.length - 1) % SHOTS.length)
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, zoom])

  return (
    <>
      <div className="mb-3 rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-t-xl px-4 pt-3 pb-2 text-left hover:bg-gray-50 transition-colors"
        >
          <Images className="h-6 w-6 shrink-0 text-blue-600" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-gray-900">¿Qué fotos debo tomar?</span>
            <span className="block text-sm text-gray-600">
              Mira los ejemplos de cada ángulo
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-blue-600" />
        </button>
        <div className="grid grid-cols-4 gap-2 px-4 pb-2">
          {PREVIEW.map(({ label, index }) => (
            <button key={label} type="button" onClick={() => setZoom(index)} className="text-center" aria-label={`Ver ejemplo: ${label}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SHOTS[index].src} alt="" className="aspect-square w-full rounded-lg object-cover bg-gray-100" loading="lazy" />
              <span className="mt-1 block text-xs text-gray-700">{label}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="px-4 pb-3 text-sm font-medium text-blue-600 hover:underline">
          Ver los {SHOTS.length} ángulos →
        </button>
        <MinimumProgress uploaded={uploaded} className="border-t px-4 py-3" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-guide-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
              <div>
                <h2 id="photo-guide-title" className="text-lg font-semibold text-gray-900">
                  {SHOTS.length} fotos recomendadas para tu auto
                </h2>
                <p className="text-sm text-gray-600">
                  Sube al menos {MIN_PHOTOS}; las marcadas como <b>Mínima</b> no deben faltar. Toca un ejemplo para verlo más grande.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {SHOTS.map((shot, i) => (
                  <li key={shot.title} className="overflow-hidden rounded-lg border border-gray-200">
                    <button type="button" onClick={() => setZoom(i)} className="block w-full" aria-label={`Ampliar ejemplo ${i + 1}: ${shot.title}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.src} alt="" className="aspect-[8/5] w-full object-cover bg-gray-100" loading="lazy" />
                    </button>
                    <div className="p-2">
                      <p className="text-sm font-medium text-gray-900">
                        {i + 1}. {shot.title}
                        {shot.essential && (
                          <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 align-middle">Mínima</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">{shot.hint}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-lg bg-blue-50 p-3">
                <p className="mb-1 text-sm font-medium text-gray-900">Consejos</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                  {TIPS.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <MinimumProgress uploaded={uploaded} className="min-w-0 flex-1" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 rounded-xl border border-border px-4 text-sm text-gray-900 hover:bg-gray-50"
                >
                  Listo
                </button>
                <button
                  type="button"
                  onClick={onUpload}
                  disabled={uploading}
                  className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Subir fotos
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

        {zoom !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={(e) => { e.stopPropagation(); setZoom(null) }}>
            <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SHOTS[zoom].src} alt={SHOTS[zoom].title} className="w-full rounded-lg" />
              <p className="mt-3 text-center text-white">
                <span className="font-medium">{zoom + 1}. {SHOTS[zoom].title}</span>
                <span className="block text-sm text-gray-300">{SHOTS[zoom].hint}</span>
              </p>
              <button type="button" onClick={() => setZoom(null)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-800" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((zoom + SHOTS.length - 1) % SHOTS.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-gray-800"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((zoom + 1) % SHOTS.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-gray-800"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}
    </>
  )
}

// Checklist del mínimo de fotos para publicar
function MinimumProgress({ uploaded, className = '' }: { uploaded: number; className?: string }) {
  const ok = uploaded >= MIN_PHOTOS
  return (
    <div className={className}>
      <p className={`text-sm font-medium ${ok ? 'text-green-700' : 'text-gray-800'}`}>
        {ok ? `✓ ${uploaded} fotos: ya puedes publicar` : `${uploaded} de ${MIN_PHOTOS} fotos mínimas`}
      </p>
      <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${ok ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, (uploaded / MIN_PHOTOS) * 100)}%` }} />
      </div>
    </div>
  )
}
