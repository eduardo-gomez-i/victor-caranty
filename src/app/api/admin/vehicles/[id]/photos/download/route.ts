import { NextResponse } from 'next/server'
import path from 'path'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { exportPhotoUrls, readPhoto } from '@/lib/photo-ai/export'
import { createZip } from '@/lib/zip'

export const runtime = 'nodejs'

function slug(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Descarga un .zip con las fotos (editadas por la IA cuando existen) para publicar en otros medios
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(['ADMIN'])
  const { id } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { make: true, model: true, year: true } })
  if (!vehicle) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 })

  const base = slug(`${vehicle.make} ${vehicle.model} ${vehicle.year}`) || 'vehiculo'
  const photos = await exportPhotoUrls(id)
  const files: { name: string; data: Buffer }[] = []
  for (const [index, photo] of photos.entries()) {
    const data = await readPhoto(photo.url)
    if (!data) continue
    const ext = path.extname(photo.url.split('?')[0]).toLowerCase() || '.jpg'
    files.push({ name: `${base}-${String(index + 1).padStart(2, '0')}${ext}`, data })
  }
  if (files.length === 0) return NextResponse.json({ error: 'No hay fotos para descargar' }, { status: 404 })

  const zip = createZip(files)
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${base}-fotos.zip"`,
      'Content-Length': String(zip.length),
      'Cache-Control': 'no-store',
    },
  })
}
