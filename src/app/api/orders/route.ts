import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { z } from "zod"

export const runtime = "nodejs"

const createOrderSchema = z.object({
  vehicleId: z.string().min(1),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  buyerPhone: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  message: z.string().max(2000).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parsed.data.vehicleId },
      select: { id: true, isActive: true, status: true },
    })
    if (!vehicle || !vehicle.isActive || vehicle.status !== "active") {
      return NextResponse.json({ error: "Vehículo no disponible" }, { status: 404 })
    }

    const order = await prisma.order.create({
      data: {
        vehicleId: parsed.data.vehicleId,
        buyerName: parsed.data.buyerName,
        buyerEmail: parsed.data.buyerEmail,
        buyerPhone: parsed.data.buyerPhone,
        message: parsed.data.message,
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("POST /api/orders error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

