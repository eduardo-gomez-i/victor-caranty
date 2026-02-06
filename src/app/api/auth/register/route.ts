import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  location: z.any().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { name, email, password, phone, location } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        location,
        passwordHash,
        role: 'SELLER',
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
