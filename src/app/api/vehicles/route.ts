import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'

export const runtime = 'nodejs'

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1900),
  mileage: z.coerce.number().int().min(0),
  price: z.coerce.number().positive(),
  type: z.string().optional(),
  status: z.enum(['active', 'paused', 'sold', 'pending', 'rejected']).optional(),
  state: z.string().min(1),
  description: z.string().optional(),
  location: z.any().optional(),
  images: z.array(z.string().min(1)).optional()
})

async function notifyAdminsAboutPendingVehicle(args: {
  origin: string
  vehicle: {
    id: string
    make: string
    model: string
    year: number
    mileage: number
    price: unknown
    state: string | null
    status: string
    userId: string
  }
}) {
  const debugEnabled = process.env.MAILGUN_DEBUG === '1' || process.env.MAILGUN_DEBUG === 'true'
  const mask = (v: string) => (v.length <= 8 ? '***' : `${v.slice(0, 4)}...${v.slice(-4)}`)

  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  if (!apiKey || !domain) {
    if (debugEnabled) {
      console.log('Mailgun config missing', {
        hasApiKey: Boolean(apiKey),
        hasDomain: Boolean(domain),
        domain,
      })
    }
    return
  }

  const fixed = 'vic.tor56@hotmail.com'
  const to = fixed
  if (!to) return

  const seller = await prisma.user.findUnique({
    where: { id: args.vehicle.userId },
    select: { name: true, email: true, phone: true },
  })

  const from = process.env.MAILGUN_FROM || `postmaster@${domain}`
  const envBaseUrl = process.env.MAILGUN_BASE_URL
  const baseUrl = (envBaseUrl || 'https://api.mailgun.net').replace(/\/+$/, '')
  const subject = `Nuevo vehículo pendiente: ${args.vehicle.make} ${args.vehicle.model} ${args.vehicle.year}`
  const adminUrl = `${args.origin}/admin/vehicles`
  const vehicleUrl = `${args.origin}/vehicles/${args.vehicle.id}`

  const body = new URLSearchParams({
    from,
    to,
    subject,
    text: [
      'Se registró un nuevo vehículo y requiere verificación.',
      '',
      `Vehículo: ${args.vehicle.make} ${args.vehicle.model} ${args.vehicle.year}`,
      `Precio: ${String(args.vehicle.price)}`,
      `Kilometraje: ${args.vehicle.mileage}`,
      `Estado: ${args.vehicle.state ?? '-'}`,
      '',
      `Vendedor: ${seller?.name ?? '-'} (${seller?.email ?? '-'}) ${seller?.phone ?? ''}`.trim(),
      '',
      `Panel admin: ${adminUrl}`,
      `Detalle: ${vehicleUrl}`,
    ].join('\n'),
    html: [
      '<p>Se registró un nuevo vehículo y requiere verificación.</p>',
      `<ul>`,
      `<li><b>Vehículo:</b> ${args.vehicle.make} ${args.vehicle.model} ${args.vehicle.year}</li>`,
      `<li><b>Precio:</b> ${String(args.vehicle.price)}</li>`,
      `<li><b>Kilometraje:</b> ${args.vehicle.mileage}</li>`,
      `<li><b>Estado:</b> ${args.vehicle.state ?? '-'}</li>`,
      `</ul>`,
      `<p><b>Vendedor:</b> ${seller?.name ?? '-'} (${seller?.email ?? '-'}) ${seller?.phone ?? ''}</p>`,
      `<p><a href="${adminUrl}">Abrir panel admin</a></p>`,
      `<p><a href="${vehicleUrl}">Abrir detalle del vehículo</a></p>`,
    ].join(''),
  })

  const url = `${baseUrl}/v3/${domain}/messages`
  const authorization = `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`

  if (debugEnabled) {
    console.log('Mailgun request', {
      url,
      domain,
      from,
      to,
      apiKeyMasked: mask(apiKey),
      apiKeyLen: apiKey.length,
      origin: args.origin,
      vehicleId: args.vehicle.id,
    })
  }

  const send = async (targetBaseUrl: string) => {
    const targetUrl = `${targetBaseUrl.replace(/\/+$/, '')}/v3/${domain}/messages`
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
    return { res, targetUrl }
  }

  let { res, targetUrl } = await send(baseUrl)
  if (res.status === 401 && !envBaseUrl) {
    const fallbackBaseUrl = 'https://api.eu.mailgun.net'
    if (debugEnabled) {
      console.log('Mailgun 401, retrying with EU endpoint', { fallbackBaseUrl })
    }
    ;({ res, targetUrl } = await send(fallbackBaseUrl))
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    console.error('Mailgun error:', res.status, msg)
    if (debugEnabled) {
      console.log('Mailgun response headers', {
        targetUrl,
        wwwAuthenticate: res.headers.get('www-authenticate'),
        requestId: res.headers.get('x-request-id'),
      })
    }
  } else if (debugEnabled) {
    const okMsg = await res.text().catch(() => '')
    console.log('Mailgun ok:', res.status, okMsg)
  }
}

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

    // Automatically set status based on user role
    if (user.role === 'ADMIN') {
      vehicleData.status = 'active'
    } else {
      vehicleData.status = 'pending'
    }

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

    if (vehicle.status === 'pending') {
      try {
        await notifyAdminsAboutPendingVehicle({
          origin: request.nextUrl.origin,
          vehicle: {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            mileage: vehicle.mileage,
            price: vehicle.price,
            state: vehicle.state ?? null,
            status: vehicle.status,
            userId: vehicle.userId,
          },
        })
      } catch (e) {
        console.error('Failed to send pending-vehicle email:', e)
      }
    }
    
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
