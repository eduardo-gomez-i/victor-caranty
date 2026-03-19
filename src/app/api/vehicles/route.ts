import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1900),
  mileage: z.coerce.number().int().min(0),
  price: z.coerce.number().positive(),
  type: z.string().optional(),
  description: z.string().optional(),
  location: z.any().optional(),
  images: z.array(z.string().min(1)).optional()
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const make = searchParams.get('make')
  const type = searchParams.get('type')
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  
  const where: Prisma.VehicleWhereInput = {
    isActive: true,
    status: 'active'
  }
  if (make) {
    where.OR = [
      { make: { contains: make } },
      { model: { contains: make } }
    ]
  }
  if (type) where.type = type
  const priceFilter: { gte?: number; lte?: number } = {}
  if (minPrice !== undefined) priceFilter.gte = minPrice
  if (maxPrice !== undefined) priceFilter.lte = maxPrice
  if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) where.price = priceFilter

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      images: {
        where: { isPrimary: true },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return NextResponse.json(vehicles)
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['SELLER', 'ADMIN'])
    const body = await request.json()
    const validation = vehicleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }
    const { images, ...vehicleData } = validation.data

    const vehicle = await prisma.vehicle.create({
      data: {
        ...vehicleData,
        userId: user.id,
        images: images ? {
          create: images.map((url, index) => ({
            url,
            displayOrder: index,
            isPrimary: index === 0
          }))
        } : undefined
      },
      include: {
        images: true
      }
    })
    
    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Debe iniciar sesión' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'No tiene permisos para publicar' }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
