'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, RotateCcw, Sparkles, Sun, Undo2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { PHOTO_FLAG_LABELS, PhotoFlag } from '@/lib/photo-ai/flags'

// Por encima de este % la IA reconstruyó una zona grande (p. ej. un asiento bajo un objeto): revisar con lupa.
const LARGE_AREA_PCT = 5

export interface PhotoReview {
  index: number
  currentUrl: string
  // Oculta al público hasta que el admin la apruebe
  hidden: boolean
  job: {
    id: string
    status: string
    originalUrl: string
    processedUrl: string | null
    plateFound: boolean
    removedItems: string[]
    replacedPct: number | null
    costUsd: number | null
    error: string | null
    // Retoques aplicados y los que la detección sugiere ofrecer
    options: { clean: boolean; deglare: boolean }
    suggestions: { dirt: boolean; glare: boolean; interior: boolean }
    // Problemas de contenido detectados (detienen la publicación automática)
    flags: PhotoFlag[]
  } | null
}

type Action = 'approve' | 'original' | 'reprocess' | 'clean' | 'deglare'

const RETOUCH = {
  clean: { on: 'Limpiar suciedad', off: 'Quitar limpieza' },
  deglare: { on: 'Reducir destello del sol', off: 'Quitar reducción de destello' },
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En cola', className: 'bg-gray-100 text-gray-700' },
  processing: { label: 'Procesando…', className: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Por revisar', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Editada publicada', className: 'bg-green-100 text-green-800' },
  original: { label: 'Original publicada', className: 'bg-gray-100 text-gray-700' },
  unchanged: { label: 'Sin cambios necesarios', className: 'bg-gray-100 text-gray-700' },
  failed: { label: 'Error', className: 'bg-red-100 text-red-800' },
}

export default function PhotoReviewCard({ photo }: { photo: PhotoReview }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const { job } = photo

  const act = async (action: Action) => {
    // "clean" y "deglare" reprocesan la foto activando o quitando ese retoque
    const retouch = action === 'clean' || action === 'deglare'
    if ((action === 'reprocess' || retouch) && !window.confirm('Reprocesar genera un nuevo costo de IA (aprox. $0.07 USD). ¿Continuar?')) return
    setLoading(action)
    try {
      const body = retouch
        ? { action: 'reprocess', options: { [action]: !job!.options[action] } }
        : { action }
      const res = await fetch(`/api/admin/photos/${job!.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la foto')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  const status = job ? STATUS[job.status] ?? { label: job.status, className: 'bg-gray-100 text-gray-700' } : null
  const showEdited = job?.processedUrl && ['ready', 'approved', 'original'].includes(job.status)
  const largeArea = (job?.replacedPct ?? 0) > LARGE_AREA_PCT

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-gray-900">
          Foto {photo.index + 1}
          {photo.hidden && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Oculta al público
            </span>
          )}
        </div>
        {status ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        ) : (
          <span className="text-xs text-gray-500">Sin procesamiento con IA</span>
        )}
      </div>

      <div className={`grid gap-3 ${showEdited ? 'sm:grid-cols-2' : ''}`}>
        <figure className="space-y-1">
          <a href={job?.originalUrl ?? photo.currentUrl} target="_blank" rel="noopener noreferrer">
            <img src={job?.originalUrl ?? photo.currentUrl} alt="Original" className="w-full rounded-lg object-contain bg-gray-100 max-h-96" />
          </a>
          <figcaption className="text-xs text-gray-500">Antes (original)</figcaption>
        </figure>
        {showEdited && (
          <figure className="space-y-1">
            <a href={job!.processedUrl!} target="_blank" rel="noopener noreferrer">
              <img src={job!.processedUrl!} alt="Editada" className="w-full rounded-lg object-contain bg-gray-100 max-h-96" />
            </a>
            <figcaption className="text-xs text-gray-500">Después (IA)</figcaption>
          </figure>
        )}
      </div>

      {job && (
        <div className="text-sm text-gray-700 space-y-1">
          {job.status === 'failed' && job.error && <p className="text-red-700">Error: {job.error}</p>}
          {job.flags.length > 0 && (
            <p className="flex items-start gap-1.5 text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Revisar contenido: {job.flags.map((f) => PHOTO_FLAG_LABELS[f]).join(', ')}.
            </p>
          )}
          {showEdited && (
            <>
              <p>
                Placa: {job.plateFound ? 'cubierta con la placa Easy Motores' : 'no se detectó'}
                {job.removedItems.length > 0 && <> · Se quitó: {job.removedItems.join(', ')}</>}
              </p>
              {(job.options.clean || job.options.deglare) && (
                <p>
                  Retoques: {[job.options.clean && 'limpieza de suciedad', job.options.deglare && 'destello del sol reducido']
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {largeArea && (
                <p className="flex items-start gap-1.5 text-amber-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  La IA reconstruyó {job.replacedPct}% de la foto. Revisa que no haya inventado o borrado daños,
                  costuras o desgaste bajo los objetos.
                </p>
              )}
            </>
          )}
          {job.costUsd !== null && <p className="text-xs text-gray-500">Costo IA: ${job.costUsd.toFixed(3)} USD</p>}
        </div>
      )}

      {job && !['pending', 'processing'].includes(job.status) && (
        <div className="flex flex-wrap gap-2">
          {['ready', 'original'].includes(job.status) && job.processedUrl && (
            <Button size="sm" onClick={() => act('approve')} isLoading={loading === 'approve'} disabled={!!loading}>
              {loading !== 'approve' && <Check className="mr-1.5 h-4 w-4" />}
              Aprobar editada
            </Button>
          )}
          {(['ready', 'approved'].includes(job.status) || photo.hidden) && (
            <Button size="sm" variant="outline" onClick={() => act('original')} isLoading={loading === 'original'} disabled={!!loading}>
              {loading !== 'original' && <Undo2 className="mr-1.5 h-4 w-4" />}
              {photo.hidden ? 'Publicar original' : 'Usar original'}
            </Button>
          )}
          {/* Limpieza solo en interiores: el exterior se publica tal cual */}
          {(job.suggestions.interior || job.options.clean) && (
            <Button size="sm" variant="outline" onClick={() => act('clean')} isLoading={loading === 'clean'} disabled={!!loading}>
              {loading !== 'clean' && <Sparkles className="mr-1.5 h-4 w-4 text-primary" />}
              {job.options.clean ? RETOUCH.clean.off : RETOUCH.clean.on}
              {!job.options.clean && job.suggestions.dirt && <span className="ml-1 text-xs text-gray-500">(sugerido)</span>}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => act('deglare')} isLoading={loading === 'deglare'} disabled={!!loading}>
            {loading !== 'deglare' && <Sun className="mr-1.5 h-4 w-4 text-amber-500" />}
            {job.options.deglare ? RETOUCH.deglare.off : RETOUCH.deglare.on}
            {!job.options.deglare && job.suggestions.glare && <span className="ml-1 text-xs text-gray-500">(sugerido)</span>}
          </Button>
          <Button size="sm" variant="outline" onClick={() => act('reprocess')} isLoading={loading === 'reprocess'} disabled={!!loading}>
            {loading !== 'reprocess' && <RotateCcw className="mr-1.5 h-4 w-4" />}
            Reprocesar
          </Button>
        </div>
      )}
    </div>
  )
}
