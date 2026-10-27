import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { checkListingText } from "@/lib/moderation"
import { notifyAdminsAboutPendingVehicle } from "@/lib/notify-admin"
import { PHOTO_FLAG_LABELS, parseFlags } from "@/lib/photo-ai/flags"
import { urlKey } from "@/lib/photo-ai/keys"

// Publicación automática de anuncios de vendedores:
// 1. Se revisa el texto al guardar (teléfonos, redes, enlaces, spam).
// 2. Si está limpio, el vehículo queda en "reviewing" mientras la IA procesa las fotos.
// 3. Cuando todas las fotos terminan sin problemas, se publican las editadas y el vehículo pasa a "active".
// Cualquier alerta lo manda a "pending" (revisión del admin) con los motivos y un correo.

// Por encima de este % reconstruido por la IA, la foto la revisa una persona (podría ocultar daños)
export const AUTO_REVIEW_MAX_REPLACED_PCT = 5

interface ListingText {
  make: string
  model: string
  version?: string | null
  description?: string | null
}

export function listingTextReasons(v: ListingText) {
  return checkListingText([v.make, v.model, v.version, v.description]).map((r) => `Descripción: ${r.toLowerCase()}`)
}

// Estado inicial de una publicación (o edición) de vendedor.
export function initialListingStatus(textReasons: string[], imageCount: number, photoAi: boolean) {
  if (textReasons.length > 0) return { status: "pending", reasons: textReasons }
  if (imageCount === 0) return { status: "active", reasons: [] }
  if (!photoAi) return { status: "pending", reasons: ["Las fotos no pudieron revisarse automáticamente"] }
  return { status: "reviewing", reasons: [] }
}

// Tras guardar: avisa al admin si quedó pendiente, o intenta cerrar la revisión automática
// (por ejemplo, una edición que no cambió las fotos ya revisadas).
export async function afterListingSaved(vehicleId: string, reasons: string[], origin?: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle) return
  if (vehicle.status === "pending") {
    await notify(vehicle, reasons, origin)
  } else if (vehicle.status === "reviewing") {
    await finalizeAutoReview(vehicleId, origin)
  }
}

export async function finalizeAutoReview(vehicleId: string, origin?: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { images: { orderBy: { displayOrder: "asc" } } },
  })
  if (!vehicle || vehicle.status !== "reviewing") return

  const urls = vehicle.images.map((i) => i.url)
  const jobs = await prisma.photoJob.findMany({
    where: { OR: [{ urlKey: { in: urls.map(urlKey) } }, { processedUrl: { in: urls } }] },
  })

  const reasons: string[] = []
  for (const [index, image] of vehicle.images.entries()) {
    const n = index + 1
    const job = jobs.find((j) => j.originalUrl === image.url || j.processedUrl === image.url)
    if (!job) {
      if (!image.url.startsWith("/uploads/")) reasons.push(`Foto ${n}: no se puede revisar automáticamente`)
      // Foto local sin trabajo todavía: se está encolando
      else return
      continue
    }
    if (job.status === "pending" || job.status === "processing") return
    if (job.status === "failed") reasons.push(`Foto ${n}: no se pudo procesar con IA`)
    const flags = parseFlags(job.flags)
    if (flags.length > 0) reasons.push(`Foto ${n}: ${flags.map((f) => PHOTO_FLAG_LABELS[f]).join(", ")}`)
    if (job.status === "ready" && (job.replacedPct ?? 0) > AUTO_REVIEW_MAX_REPLACED_PCT) {
      reasons.push(`Foto ${n}: la IA reconstruyó ${job.replacedPct}% de la foto (revisar que no oculte daños)`)
    }
  }

  const status = reasons.length > 0 ? "pending" : "active"
  // Solo un proceso cierra la revisión
  const claimed = await prisma.vehicle.updateMany({
    where: { id: vehicleId, status: "reviewing" },
    data: { status, moderationFlags: reasons.length > 0 ? reasons : Prisma.DbNull },
  })
  if (claimed.count === 0) return

  if (status === "pending") {
    await notify({ ...vehicle, status }, reasons, origin)
    return
  }
  // Todo en orden: se publican las versiones editadas (placa cubierta, objetos quitados)
  for (const job of jobs) {
    if (job.status !== "ready" || !job.processedUrl) continue
    await prisma.$transaction([
      prisma.image.updateMany({ where: { vehicleId, url: job.originalUrl }, data: { url: job.processedUrl } }),
      prisma.photoJob.update({ where: { id: job.id }, data: { status: "approved" } }),
    ])
  }
}

// Edición que se puede publicar sin que la vea una persona
export function isSafeEdit(job: { flags: unknown; replacedPct: number | null }) {
  return parseFlags(job.flags).length === 0 && (job.replacedPct ?? 0) <= AUTO_REVIEW_MAX_REPLACED_PCT
}

// Al guardar un anuncio fuera de la revisión automática: publica las ediciones que ya terminaron
// (las fotos se procesan desde que se suben en el formulario).
export async function applyFinishedEdits(urls: string[]) {
  const jobs = await prisma.photoJob.findMany({
    where: { urlKey: { in: urls.map(urlKey) }, status: "ready" },
    select: { id: true },
  })
  for (const job of jobs) await autoApproveSafePhoto(job.id)
}

// Fuera de la revisión automática (anuncios del admin, ya publicados o reprocesos), la foto editada
// se publica sola si no hay alertas de contenido ni una reconstrucción grande; si no, espera al admin.
export async function autoApproveSafePhoto(jobId: string) {
  const job = await prisma.photoJob.findUnique({ where: { id: jobId } })
  if (!job || job.status !== "ready" || !job.processedUrl) return
  if (!isSafeEdit(job)) return
  const images = await prisma.image.findMany({
    where: { url: job.originalUrl, vehicle: { status: { not: "reviewing" } } },
    select: { id: true },
  })
  if (images.length === 0) return
  await prisma.$transaction([
    prisma.image.updateMany({ where: { id: { in: images.map((i) => i.id) } }, data: { url: job.processedUrl } }),
    prisma.photoJob.update({ where: { id: job.id }, data: { status: "approved" } }),
  ])
}

// Vehículos en revisión automática que usan esta foto
export async function finalizeVehiclesUsingPhoto(originalUrl: string) {
  const images = await prisma.image.findMany({
    where: { url: originalUrl, vehicle: { status: "reviewing" } },
    select: { vehicleId: true },
  })
  for (const vehicleId of new Set(images.map((i) => i.vehicleId))) {
    await finalizeAutoReview(vehicleId)
  }
}

async function notify(
  vehicle: { id: string; make: string; model: string; year: number; mileage: number; price: unknown; state: string | null; status: string; userId: string },
  reasons: string[],
  origin?: string
) {
  try {
    await notifyAdminsAboutPendingVehicle({
      origin,
      reasons,
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
    console.error("Failed to send pending-vehicle email:", e)
  }
}
