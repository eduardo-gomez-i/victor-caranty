import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { saveVerifiedSpecFromVehicle } from '@/lib/vehicle-specs'
import { publishHiddenPhotos } from '@/lib/listing-review'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['active', 'rejected', 'pending', 'paused', 'sold'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { status }
    })

    if (vehicle.status === 'active') {
      // Aprobar el anuncio publica también las fotos que la revisión automática dejó ocultas
      try {
        await publishHiddenPhotos(vehicle.id)
      } catch (e) {
        console.error('No se pudieron publicar las fotos ocultas:', e)
      }
      try {
        await saveVerifiedSpecFromVehicle(vehicle)
      } catch (e) {
        console.error('No se pudo guardar la ficha verificada:', e)
      }
    }

    return NextResponse.json(vehicle)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Debe iniciar sesión' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error al actualizar el vehículo' }, { status: 500 })
  }
}
