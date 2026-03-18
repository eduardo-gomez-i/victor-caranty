import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { z } from "zod"

export const runtime = "nodejs"

const updateOrderSchema = z
  .object({
    status: z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELED"]).optional(),
    adminNotes: z.string().max(5000).optional().nullable(),
  })
  .refine((v) => v.status !== undefined || v.adminNotes !== undefined, { message: "Nada para actualizar" })

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            price: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    })
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes === undefined ? undefined : parsed.data.adminNotes,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            price: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/admin/orders/[id] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

