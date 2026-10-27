import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { urlKey } from '@/lib/photo-ai/keys'
import { photoAiEnabled } from '@/lib/photo-ai/worker'
import { isSafeEdit } from '@/lib/listing-review'

export const runtime = 'nodejs'

const bodySchema = z.object({ urls: z.array(z.string().min(1)).max(50) })

export type PhotoAiState = 'processing' | 'edited' | 'review' | 'removed' | 'original'

// Estado de la edición con IA de las fotos que el usuario está subiendo en el formulario
export async function POST(request: NextRequest) {
  await requireAuth()
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  const { urls } = parsed.data
  if (!photoAiEnabled()) return NextResponse.json({ enabled: false, photos: {} })

  const jobs = await prisma.photoJob.findMany({
    where: { OR: [{ urlKey: { in: urls.map(urlKey) } }, { processedUrl: { in: urls } }] },
  })
  const photos: Record<string, { state: PhotoAiState; editedUrl?: string }> = {}
  for (const url of urls) {
    const job = jobs.find((j) => j.originalUrl === url || j.processedUrl === url)
    // Sin trabajo: fotos anteriores al módulo o formatos que la IA no procesa (se encolan al guardar)
    if (!job) {
      photos[url] = { state: 'original' }
    } else if (job.status === 'pending' || job.status === 'processing') {
      photos[url] = { state: 'processing' }
    } else if (job.status === 'discarded') {
      photos[url] = { state: 'removed' }
    } else if ((job.status === 'ready' || job.status === 'approved') && job.processedUrl) {
      photos[url] = isSafeEdit(job) ? { state: 'edited', editedUrl: job.processedUrl } : { state: 'review' }
    } else {
      photos[url] = { state: 'original' }
    }
  }
  return NextResponse.json({ enabled: true, photos })
}
