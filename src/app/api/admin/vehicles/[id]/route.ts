import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

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
