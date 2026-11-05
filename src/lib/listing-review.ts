import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { checkListingText, removeContactInfo } from "@/lib/moderation"
import { LISTING_FOOTER } from "@/lib/listing-footer"
import { notifyAdminsAboutPendingVehicle } from "@/lib/notify-admin"
import { PHOTO_FLAG_LABELS, parseFlags } from "@/lib/photo-ai/flags"
import { urlKey } from "@/lib/photo-ai/keys"

// Publicación automática de anuncios (el admin solo interviene cuando no hay otra salida):
// 1. Al guardar, se quitan de la descripción los datos de contacto (teléfonos, redes, enlaces); solo para vendedores.
// 2. El vehículo queda en "reviewing" (no público) mientras la IA procesa las fotos.
// 3. Al terminar se publican las fotos editadas y el vehículo pasa a "active". Las fotos que la IA
//    sabe con certeza que no corresponden (no son del auto) se eliminan; las dudosas quedan ocultas sin detener
//    el anuncio ni avisar a nadie (el admin las ve en su tabla si quiere revisarlas). Las muy editadas también
//    quedan ocultas, pero esas sí se le avisan por correo porque necesitan su aprobación.
// Solo queda en "pending", y se avisa por correo, si el texto sigue con alertas (spam, contacto en marca o
// modelo) o si el anuncio no tiene ninguna foto publicable.
// Estas reglas son para los vendedores: los anuncios del admin no pasan por ellas, solo por la edición de las fotos.

// Desde este % reconstruido por la IA, la foto necesita la aprobación del admin (podría ocultar daños)
export const APPROVAL_REPLACED_PCT = 25

interface ListingText {
  make: string
  model: string
  version?: string | null
  description?: string | null
}

// Líneas del pie oficial de EasyMotores (lo agrega el generador de descripciones): no son contacto ni spam
const FOOTER_LINES = new Set(LISTING_FOOTER.split("\n").map((l) => l.trim()).filter(Boolean))

function withoutOfficialFooter(text?: string | null) {
  if (!text) return text
  return text
    .replace(LISTING_FOOTER, "")
    .split("\n")
    .filter((line) => !FOOTER_LINES.has(line.trim()))
    .join("\n")
}

// Descripción del vendedor sin datos de contacto; el pie oficial se conserva
export function cleanListingDescription(description: string | undefined) {
  return description && removeContactInfo(description, (line) => FOOTER_LINES.has(line.trim()))
}

export function listingTextReasons(v: ListingText) {
  return checkListingText([v.make, v.model, v.version, withoutOfficialFooter(v.description)]).map(
    (r) => `Descripción: ${r.toLowerCase()}`
  )
}

// Estado inicial de una publicación (o edición). El admin no pasa por la revisión de texto, pero su
// anuncio tampoco es público hasta que terminen las fotos.
export function initialListingStatus(textReasons: string[], imageCount: number, photoAi: boolean, isAdmin = false) {
  if (textReasons.length > 0) return { status: "pending", reasons: textReasons }
  if (imageCount === 0) return { status: "active", reasons: [] }
  if (!photoAi) {
    return isAdmin ? { status: "active", reasons: [] } : { status: "pending", reasons: ["Las fotos no pudieron revisarse automáticamente"] }
  }
  return { status: "reviewing", reasons: [] }
}

// Tras guardar: avisa al admin si quedó pendiente, o intenta cerrar la revisión automática
// (por ejemplo, una edición que no cambió las fotos ya revisadas).
export async function afterListingSaved(vehicleId: string, reasons: string[], origin?: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle) return
  if (vehicle.status === "pending" && reasons.length > 0) {
    await notify(vehicle, reasons, origin)
  }
  await finalizeAutoReview(vehicleId, origin)
}

type Job = Awaited<ReturnType<typeof prisma.photoJob.findMany>>[number]

// Por qué una foto no debe verse sin que la apruebe un admin (null = se puede publicar)
function photoProblem(job: Job, ownerIsAdmin: boolean): string | null {
  // El admin ya decidió: aprobó la editada o eligió publicar la original
  if (job.status === "approved" || job.status === "original") return null
  // Sin procesar, la placa real quedaría a la vista: tampoco se publica en los anuncios del admin
  if (job.status === "failed") return "no se pudo procesar con IA"
  // Las reglas de contenido son para los vendedores: el admin publica lo que decida
  if (ownerIsAdmin) return null
  const flags = parseFlags(job.flags)
  if (flags.length > 0) return flags.map((f) => PHOTO_FLAG_LABELS[f]).join(", ")
  if (needsApproval(job)) return `la IA reconstruyó ${job.replacedPct}% de la foto (revisar que no oculte daños)`
  return null
}

function needsApproval(job: Job) {
  return job.status === "ready" && (job.replacedPct ?? 0) >= APPROVAL_REPLACED_PCT
}

// Aplica el resultado de la IA a las fotos del vehículo: publica las editadas seguras y oculta
// al público las que tienen algún problema hasta que un admin las apruebe.
async function syncVehiclePhotos(vehicleId: string) {
  const images = await prisma.image.findMany({ where: { vehicleId }, orderBy: { displayOrder: "asc" } })
  const urls = images.map((i) => i.url)
  const jobs = await prisma.photoJob.findMany({
    where: { OR: [{ urlKey: { in: urls.map(urlKey) } }, { processedUrl: { in: urls } }] },
  })

  const owner = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { user: { select: { role: true } } } })
  const ownerIsAdmin = owner?.user.role === "ADMIN"

  let waiting = false
  let visible = 0
  let removed = 0
  const reasons: string[] = []
  const approvals: string[] = []
  for (const [index, image] of images.entries()) {
    const job = jobs.find((j) => j.originalUrl === image.url || j.processedUrl === image.url)
    // Sin trabajo: fotos anteriores al módulo o externas; se publican como están
    if (!job) {
      if (!image.hidden) visible++
      continue
    }
    if (job.status === "pending" || job.status === "processing") {
      waiting = true
      continue
    }
    // La IA está segura de que no corresponde al anuncio: se elimina sin pasar por el admin
    if (job.status === "discarded" && !ownerIsAdmin) {
      const flags = parseFlags(job.flags).map((f) => PHOTO_FLAG_LABELS[f]).join(", ")
      reasons.push(`Foto ${index + 1} eliminada: ${flags || "no corresponde al anuncio"}`)
      await prisma.image.delete({ where: { id: image.id } })
      removed++
      continue
    }
    const problem = photoProblem(job, ownerIsAdmin)
    if (problem) {
      reasons.push(`Foto ${index + 1} (oculta): ${problem}`)
      if (needsApproval(job)) approvals.push(`Foto ${index + 1}: la IA reconstruyó ${job.replacedPct}% de la foto (revisar que no oculte daños)`)
      if (!image.hidden) await prisma.image.update({ where: { id: image.id }, data: { hidden: true } })
      continue
    }
    visible++
    if (job.status === "ready" && job.processedUrl && image.url === job.originalUrl) {
      await prisma.$transaction([
        prisma.image.update({ where: { id: image.id }, data: { url: job.processedUrl, hidden: false } }),
        prisma.photoJob.update({ where: { id: job.id }, data: { status: "approved" } }),
      ])
    } else if (image.hidden) {
      await prisma.image.update({ where: { id: image.id }, data: { hidden: false } })
    }
  }
  if (removed > 0) await renumberImages(vehicleId)
  return { waiting, visible, total: images.length, reasons, approvals }
}

// Tras eliminar fotos: orden consecutivo y la primera como principal
async function renumberImages(vehicleId: string) {
  const rest = await prisma.image.findMany({ where: { vehicleId }, orderBy: { displayOrder: "asc" } })
  await prisma.$transaction(
    rest.map((image, index) =>
      prisma.image.update({ where: { id: image.id }, data: { displayOrder: index, isPrimary: index === 0 } })
    )
  )
}

// Revisa las fotos del vehículo y, si estaba en revisión automática y ya terminaron todas, lo publica.
// Las fotos que con certeza no corresponden se eliminan; las dudosas quedan ocultas.
// Se avisa al admin si alguna foto necesita su aprobación o si no queda ninguna visible (pasa a "pending").
export async function finalizeAutoReview(vehicleId: string, origin?: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle) return
  const photos = await syncVehiclePhotos(vehicleId)
  if (vehicle.status !== "reviewing" || photos.waiting) return

  const status = photos.total === 0 || photos.visible > 0 ? "active" : "pending"
  // Solo un proceso cierra la revisión
  const claimed = await prisma.vehicle.updateMany({
    where: { id: vehicleId, status: "reviewing" },
    data: { status, moderationFlags: photos.reasons.length > 0 ? photos.reasons : Prisma.DbNull },
  })
  if (claimed.count === 0) return
  if (status === "pending") await notify({ ...vehicle, status }, photos.reasons, origin)
  else if (photos.approvals.length > 0) await notify({ ...vehicle, status }, photos.approvals, origin, true)
}

// El admin aprueba el anuncio completo: sus fotos ocultas se publican (la versión editada si existe).
// Quedan marcadas como decididas por el admin, así que la revisión automática ya no las vuelve a ocultar.
export async function publishHiddenPhotos(vehicleId: string) {
  const hidden = await prisma.image.findMany({ where: { vehicleId, hidden: true } })
  for (const image of hidden) {
    const job = await prisma.photoJob.findFirst({ where: { OR: [{ urlKey: urlKey(image.url) }, { processedUrl: image.url }] } })
    const edited = job?.status === "ready" && job.processedUrl
    await prisma.$transaction([
      prisma.image.update({ where: { id: image.id }, data: { hidden: false, ...(edited && { url: job.processedUrl! }) } }),
      ...(job && job.status !== "approved" && job.status !== "pending" && job.status !== "processing"
        ? [prisma.photoJob.update({ where: { id: job.id }, data: { status: edited ? "approved" : "original" } })]
        : []),
    ])
  }
  return hidden.length
}

// Vehículos que usan esta foto (original o editada): aplica el resultado y cierra su revisión si toca
export async function finalizeVehiclesUsingPhoto(originalUrl: string, processedUrl?: string | null) {
  const images = await prisma.image.findMany({
    where: { url: { in: [originalUrl, ...(processedUrl ? [processedUrl] : [])] } },
    select: { vehicleId: true },
  })
  for (const vehicleId of new Set(images.map((i) => i.vehicleId))) {
    await finalizeAutoReview(vehicleId)
  }
}

async function notify(
  vehicle: { id: string; make: string; model: string; year: number; mileage: number; price: unknown; state: string | null; status: string; userId: string },
  reasons: string[],
  origin?: string,
  photosToApprove = false
) {
  try {
    await notifyAdminsAboutPendingVehicle({
      origin,
      reasons,
      photosToApprove,
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
