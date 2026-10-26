import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { kickWorker, parseOptions } from "@/lib/photo-ai/worker"

const bodySchema = z.object({
  action: z.enum(["approve", "original", "reprocess"]),
  // Solo para "reprocess": activa o quita los retoques opcionales
  options: z.object({ clean: z.boolean().optional(), deglare: z.boolean().optional() }).optional(),
})

// Revisión de una foto procesada: aprobar la editada, usar la original o reprocesar.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["ADMIN"])
    const { id } = await params
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }
    const job = await prisma.photoJob.findUnique({ where: { id } })
    if (!job) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 })
    }
    const { action } = parsed.data

    if (action === "approve") {
      if (!["ready", "original"].includes(job.status) || !job.processedUrl) {
        return NextResponse.json({ error: "La foto no está lista para aprobarse" }, { status: 409 })
      }
      await prisma.$transaction([
        prisma.image.updateMany({ where: { url: job.originalUrl }, data: { url: job.processedUrl } }),
        prisma.photoJob.update({ where: { id }, data: { status: "approved" } }),
      ])
      return NextResponse.json({ ok: true })
    }

    // "original" y "reprocess" regresan la publicación a la foto original
    const restore = job.processedUrl
      ? [prisma.image.updateMany({ where: { url: job.processedUrl }, data: { url: job.originalUrl } })]
      : []

    if (action === "original") {
      await prisma.$transaction([...restore, prisma.photoJob.update({ where: { id }, data: { status: "original" } })])
      return NextResponse.json({ ok: true })
    }

    if (job.status === "processing") {
      return NextResponse.json({ error: "La foto se está procesando" }, { status: 409 })
    }
    await prisma.$transaction([
      ...restore,
      prisma.photoJob.update({
        where: { id },
        data: {
          status: "pending",
          processedUrl: null,
          attempts: 0,
          error: null,
          options: { ...parseOptions(job.options), ...parsed.data.options },
        },
      }),
    ])
    kickWorker()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/admin/photos/[id] error:", error)
    return NextResponse.json({ error: "No se pudo actualizar la foto" }, { status: 500 })
  }
}
