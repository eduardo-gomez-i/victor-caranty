import { promises as fs } from 'fs'
import path from 'path'
import prisma from '@/lib/prisma'
import { urlKey } from './keys'

// Fotos de un vehículo para publicarlo en otros medios: la versión editada por la IA
// (placa cubierta, objetos quitados) cuando existe y el admin no eligió la original.
export async function exportPhotoUrls(vehicleId: string) {
  const images = await prisma.image.findMany({ where: { vehicleId }, orderBy: { displayOrder: 'asc' } })
  const urls = images.map((i) => i.url)
  const jobs = await prisma.photoJob.findMany({
    where: { OR: [{ urlKey: { in: urls.map(urlKey) } }, { processedUrl: { in: urls } }] },
  })
  return images.map((image) => {
    const job = jobs.find((j) => j.originalUrl === image.url || j.processedUrl === image.url)
    const edited = job?.processedUrl && ['ready', 'approved'].includes(job.status)
    return { url: edited ? job!.processedUrl! : image.url, edited: !!edited }
  })
}

export async function readPhoto(url: string): Promise<Buffer | null> {
  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null)
    return res?.ok ? Buffer.from(await res.arrayBuffer()) : null
  }
  const publicDir = path.join(process.cwd(), 'public') + path.sep
  const file = path.resolve(process.cwd(), 'public', url.replace(/^\/+/, ''))
  if (!file.startsWith(publicDir)) return null
  return fs.readFile(file).catch(() => null)
}
