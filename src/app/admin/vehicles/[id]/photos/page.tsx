import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { kickWorker, parseOptions, photoAiEnabled, urlKey } from '@/lib/photo-ai/worker'
import PhotoReviewCard, { PhotoReview } from '@/components/admin/PhotoReviewCard'
import AutoRefresh from '@/components/admin/AutoRefresh'
import ProcessPhotosButton from '@/components/admin/ProcessPhotosButton'
import { parseFlags } from '@/lib/photo-ai/flags'

export const metadata = {
  title: 'Fotos del vehículo | Admin',
}

export default async function AdminVehiclePhotosPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['ADMIN'])
  const { id } = await params

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { images: { orderBy: { displayOrder: 'asc' } } },
  })
  if (!vehicle) notFound()

  const urls = vehicle.images.map((i) => i.url)
  // Retoma la cola si el servidor se reinició con trabajos pendientes
  kickWorker()
  const jobs = await prisma.photoJob.findMany({
    where: { OR: [{ urlKey: { in: urls.map(urlKey) } }, { processedUrl: { in: urls } }] },
  })

  const photos: PhotoReview[] = vehicle.images.map((image, index) => {
    const job = jobs.find((j) => j.originalUrl === image.url || j.processedUrl === image.url)
    return {
      index,
      currentUrl: image.url,
      job: job
        ? {
            id: job.id,
            status: job.status,
            originalUrl: job.originalUrl,
            processedUrl: job.processedUrl,
            plateFound: job.plateFound,
            removedItems: Array.isArray(job.removedItems) ? (job.removedItems as string[]) : [],
            replacedPct: job.replacedPct,
            costUsd: job.costUsd === null ? null : Number(job.costUsd),
            error: job.error,
            options: { clean: !!parseOptions(job.options).clean, deglare: !!parseOptions(job.options).deglare },
            suggestions: parseSuggestions(job.suggestions),
            flags: parseFlags(job.flags),
          }
        : null,
    }
  })

  const busy = photos.some((p) => p.job && ['pending', 'processing'].includes(p.job.status))
  const toReview = photos.filter((p) => p.job?.status === 'ready').length
  const unprocessed = photos.filter((p) => !p.job).length

  return (
    <div className="space-y-6">
      <AutoRefresh active={busy} />
      <div>
        <Link href="/admin/vehicles" className="text-sm text-blue-600 hover:underline">
          ← Vehículos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Fotos: {vehicle.make} {vehicle.model} {vehicle.year}
        </h1>
        <p className="text-gray-600 mt-1">
          La IA cubre la placa y quita personas u objetos. Las fotos editadas se publican solas; solo quedan “Por revisar” las que tienen alertas o una reconstrucción grande (mientras tanto se muestra la original).
        </p>
        {!photoAiEnabled() && (
          <p className="text-sm text-amber-700 mt-2">GEMINI_API_KEY no está configurada: el procesamiento está desactivado.</p>
        )}
        {(busy || toReview > 0) && (
          <p className="text-sm text-gray-700 mt-2">
            {busy && 'Procesando fotos… esta página se actualiza sola. '}
            {toReview > 0 && `${toReview} foto(s) por revisar.`}
          </p>
        )}
        {photoAiEnabled() && unprocessed > 0 && (
          <div className="mt-3">
            <ProcessPhotosButton vehicleId={vehicle.id} count={unprocessed} />
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="text-gray-700">Este vehículo no tiene fotos.</p>
      ) : (
        <div className="space-y-4">
          {photos.map((photo) => (
            <PhotoReviewCard key={photo.currentUrl} photo={photo} />
          ))}
        </div>
      )}
    </div>
  )
}

function parseSuggestions(value: unknown) {
  const s = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return { dirt: s.dirt === true, glare: s.glare === true, interior: s.interior === true }
}
