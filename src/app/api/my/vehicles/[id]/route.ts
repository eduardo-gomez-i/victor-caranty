import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { z } from "zod"
import { saveVerifiedSpecFromVehicle } from "@/lib/vehicle-specs"

export const runtime = "nodejs"

const editSchema = z.object({
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  version: z.string().max(100).optional(),
  invoiceType: z.string().max(50).optional(),
  transmission: z.string().max(20).optional(),
  year: z.coerce.number().int().min(1900).optional(),
  mileage: z.coerce.number().int().min(0).optional(),
  price: z.coerce.number().positive().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  state: z.string().optional(),
  location: z.any().optional(),
  images: z.array(z.string().min(1)).optional(),
  isActive: z.union([z.boolean(), z.string()]).optional(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = editSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }
    const data = parsed.data

    const { id } = await context.params
    const existing = await prisma.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }
    if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const isFullEdit = data.make !== undefined || data.model !== undefined ||
      data.version !== undefined || data.invoiceType !== undefined || data.transmission !== undefined ||
      data.year !== undefined || data.mileage !== undefined || data.price !== undefined ||
      data.description !== undefined || data.type !== undefined || data.state !== undefined ||
      data.images !== undefined

    const isActiveValue =
      typeof data.isActive === "string"
        ? data.isActive === "true"
        : typeof data.isActive === "boolean"
        ? data.isActive
        : undefined

    const newStatus = isFullEdit
      ? session.user.role === "ADMIN" ? "active" : "pending"
      : existing.status

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(data.make !== undefined && { make: data.make }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.version !== undefined && { version: data.version || null }),
        ...(data.invoiceType !== undefined && { invoiceType: data.invoiceType || null }),
        ...(data.transmission !== undefined && { transmission: data.transmission || null }),
        ...(data.year !== undefined && { year: data.year }),
        ...(data.mileage !== undefined && { mileage: data.mileage }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.location !== undefined && { location: data.location }),
        ...(isActiveValue !== undefined && { isActive: isActiveValue }),
        status: newStatus,
      },
    })

    if (data.images !== undefined) {
      await prisma.image.deleteMany({ where: { vehicleId: id } })
      if (data.images.length > 0) {
        await prisma.image.createMany({
          data: data.images.map((url: string, index: number) => ({
            vehicleId: id,
            url,
            displayOrder: index,
            isPrimary: index === 0,
          })),
        })
      }
    }

    if (isFullEdit && updated.status === "active") {
      try {
        await saveVerifiedSpecFromVehicle(updated)
      } catch (e) {
        console.error("No se pudo guardar la ficha verificada:", e)
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/my/vehicles/[id] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
    }

    const { id } = await context.params
    const existing = await prisma.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }
    if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    await prisma.image.deleteMany({ where: { vehicleId: id } })
    await prisma.vehicle.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/my/vehicles/[id] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
