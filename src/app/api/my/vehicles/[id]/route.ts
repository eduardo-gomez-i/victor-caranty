import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export const runtime = "nodejs"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
    }

    // Allow form POST override (_method=PATCH)
    const contentType = request.headers.get("content-type") || ""
    let data: Record<string, unknown> = {}
    if (contentType.includes("application/json")) {
      data = await request.json()
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData()
      data = Object.fromEntries(form.entries())
    }

    const id = params.id
    const existing = await prisma.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 })
    }
    if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const rawIsActive = (data as { isActive?: unknown }).isActive
    const isActive =
      typeof rawIsActive === "string"
        ? rawIsActive === "true"
        : typeof rawIsActive === "boolean"
        ? rawIsActive
        : undefined

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        isActive: isActive ?? existing.isActive,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/my/vehicles/[id] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
    }

    // Allow form POST override (_method=DELETE)
    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData()
      const method = form.get("_method")
      if (method !== "DELETE") {
        return NextResponse.json({ error: "Método inválido" }, { status: 400 })
      }
    }

    const id = params.id
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
