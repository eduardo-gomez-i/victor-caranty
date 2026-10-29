import fs from "fs/promises"
import path from "path"
import prisma from "@/lib/prisma"
import { urlKey } from "@/lib/photo-ai/keys"

const UPLOADS = path.join(process.cwd(), "public", "uploads") + path.sep

// Borra del disco las fotos de un vehículo ya eliminado (original y editada por la IA), para que eliminar
// los autos vendidos libere espacio. Se conservan las que todavía usa otro anuncio.
export async function deletePhotoFiles(urls: string[]) {
  if (urls.length === 0) return
  const jobs = await prisma.photoJob.findMany({
    where: { OR: [{ urlKey: { in: urls.map(urlKey) } }, { processedUrl: { in: urls } }] },
    select: { originalUrl: true, processedUrl: true },
  })
  const files = new Set(urls)
  for (const job of jobs) {
    files.add(job.originalUrl)
    if (job.processedUrl) files.add(job.processedUrl)
  }
  const inUse = await prisma.image.findMany({ where: { url: { in: [...files] } }, select: { url: true } })
  for (const url of inUse) files.delete(url.url)

  for (const url of files) {
    const file = path.resolve(process.cwd(), "public", url.replace(/^\/+/, ""))
    if (!file.startsWith(UPLOADS)) continue
    await fs.unlink(file).catch(() => {})
  }
}
