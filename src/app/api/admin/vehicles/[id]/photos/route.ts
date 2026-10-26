import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { enqueuePhotos, photoAiEnabled } from "@/lib/photo-ai/worker"

// Encola las fotos de un vehículo que todavía no pasan por la IA (p. ej. publicados antes del módulo).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["ADMIN"])
    if (!photoAiEnabled()) {
      return NextResponse.json({ error: "El procesamiento con IA no está configurado" }, { status: 503 })
    }
    const { id } = await params
    const images = await prisma.image.findMany({ where: { vehicleId: id }, select: { url: true } })
    await enqueuePhotos(images.map((i) => i.url))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/admin/vehicles/[id]/photos error:", error)
    return NextResponse.json({ error: "No se pudieron encolar las fotos" }, { status: 500 })
  }
}
