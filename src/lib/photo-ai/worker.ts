import fs from "fs/promises"
import path from "path"
import prisma from "@/lib/prisma"
import { finalizeVehiclesUsingPhoto } from "@/lib/listing-review"
import { urlKey } from "./keys"
import { Box, Detection, EditOptions, GeminiClient } from "./gemini"
import { Region, alignEdit, applyPlate, blendEdits, blurBoxes, cropRaw, downscaledJpeg, encodeJpeg, loadRaw, pasteRaw } from "./compose"

const PLATE_GRAPHIC = path.join(process.cwd(), "public", "brand", "placa-easymotores.png")
const OUTPUT_DIR = path.join(process.cwd(), "public", "uploads", "ai")
const DETECT_SIDE = 1536 // lado mayor de la imagen enviada para detectar
const EDIT_SIDE = 2048 // lado mayor de la imagen enviada al editor (la respuesta es 1K)
const MAX_ATTEMPTS = 2
// Diferencia media (0-255) fuera de los objetos tras alinear; por encima, la IA alteró la escena
const MAX_RESIDUAL = 25
// Un trabajo en "processing" más tiempo que esto se considera huérfano (servidor reiniciado)
const STALE_MS = 10 * 60_000
// Fotos en paralelo: un anuncio de 10 fotos queda listo en pocos minutos sin saturar el servidor
const CONCURRENCY = 3

export function photoAiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY)
}

export { urlKey }

// Crea trabajos para las fotos subidas que aún no tienen uno y arranca el procesamiento.
// Solo fotos locales (/uploads/...); las ya procesadas (/uploads/ai/...) se ignoran.
// vehicle: año, marca y modelo si ya se conocen (al subir desde el formulario), para reconstruir con fidelidad
export async function enqueuePhotos(urls: string[], vehicle?: string) {
  if (!photoAiEnabled()) return
  const candidates = urls.filter((u) => u.startsWith("/uploads/") && !u.startsWith("/uploads/ai/"))
  if (candidates.length === 0) return
  const keys = candidates.map(urlKey)
  const existing = await prisma.photoJob.findMany({ where: { urlKey: { in: keys } }, select: { urlKey: true } })
  const known = new Set(existing.map((j) => j.urlKey))
  const fresh = candidates.filter((u) => !known.has(urlKey(u)))
  if (fresh.length > 0) {
    await prisma.photoJob.createMany({
      data: fresh.map((originalUrl) => ({
        urlKey: urlKey(originalUrl),
        originalUrl,
        costUsd: 0,
        ...(vehicle && { options: { vehicle } }),
      })),
      skipDuplicates: true,
    })
  }
  kickWorker()
}

// Un solo procesador por proceso de Node, con CONCURRENCY fotos a la vez.
const state = globalThis as unknown as { __photoWorkerRunning?: boolean }

export function kickWorker() {
  if (!photoAiEnabled() || state.__photoWorkerRunning) return
  state.__photoWorkerRunning = true
  void runQueue()
    .catch((error) => console.error("photo-ai: la cola se detuvo:", error))
    .finally(async () => {
      state.__photoWorkerRunning = false
      // Fotos que llegaron justo cuando la cola terminaba
      const pending = await prisma.photoJob.count({ where: { status: "pending" } }).catch(() => 0)
      if (pending > 0) kickWorker()
    })
}

async function runQueue() {
  await prisma.photoJob.updateMany({
    where: { status: "processing", updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
    data: { status: "pending" },
  })
  await Promise.all(Array.from({ length: CONCURRENCY }, drain))
}

async function drain() {
  for (;;) {
    const job = await prisma.photoJob.findFirst({ where: { status: "pending" }, orderBy: { createdAt: "asc" } })
    if (!job) return
    const claimed = await prisma.photoJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "processing", attempts: { increment: 1 }, error: null },
    })
    if (claimed.count === 0) continue

    // El costo se acumula entre intentos y reprocesos: es lo que realmente se pagó por la foto
    const gemini = newClient()
    try {
      const { costUsd, ...result } = await processPhoto(job.originalUrl, gemini, parseOptions(job.options))
      await prisma.photoJob.update({ where: { id: job.id }, data: { ...result, costUsd: { increment: costUsd } } })
    } catch (error) {
      console.error(`photo-ai: falló ${job.originalUrl}:`, error)
      const message = error instanceof Error ? error.message : String(error)
      await prisma.photoJob.update({
        where: { id: job.id },
        data: {
          status: job.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
          error: message.slice(0, 2000),
          costUsd: { increment: roundCost(gemini.costUsd) },
        },
      })
    }
    // Si la foto pertenece a un anuncio en revisión automática, ver si ya se puede publicar
    try {
      await finalizeVehiclesUsingPhoto(job.originalUrl)
    } catch (error) {
      console.error("photo-ai: no se pudo cerrar la revisión automática:", error)
    }
  }
}

function newClient() {
  return new GeminiClient(process.env.GEMINI_API_KEY!, process.env.GEMINI_IMAGE_MODEL || undefined)
}

export function parseOptions(value: unknown): EditOptions {
  const o = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const vehicle = typeof o.vehicle === "string" ? o.vehicle.replace(/[^\p{L}\p{N} .\-/]/gu, "").trim().slice(0, 80) : ""
  return { clean: o.clean === true, deglare: o.deglare === true, ...(vehicle && { vehicle }) }
}

// El admin pidió el retoque: se aplica aunque la detección no lo haya sugerido (no siempre es constante).
// Limpieza solo en interiores (el exterior se deja original): las zonas sucias detectadas o, si no hay, la foto completa.
function cleanZones(d: Detection, W: number, H: number): Box[] {
  if (!d.interior) return []
  return d.dirt.length > 0 ? d.dirt : [[0, 0, W, H]]
}

function glareZones(d: Detection, W: number, H: number): Box[] {
  return d.glare.length > 0 ? d.glare : [[0, 0, W, H]]
}

const MAX_ZONES = 2 // ediciones enfocadas por foto; con más grupos se edita la foto completa
const ZONE_CONTEXT = 2.6 // la zona mide ~2.6 veces el objeto, para que la IA vea las piezas de alrededor
const ZONE_MIN = 0.4 // y al menos 40% del lado de la foto
const ZONE_MAX_AREA = 0.6 // si la zona ocupa más que esto, conviene editar la foto completa

function overlaps([x0, y0, x1, y1]: Box, r: Region) {
  return x1 > r.left && x0 < r.left + r.width && y1 > r.top && y0 < r.top + r.height
}

// Agrupa los objetos cercanos y arma un recorte amplio (con la proporción de la foto) alrededor de cada grupo.
// null = conviene editar la foto completa.
function focusRegions(boxes: Box[], W: number, H: number): Region[] | null {
  const zoneFor = ([x0, y0, x1, y1]: Box): Region => {
    let w = Math.max((x1 - x0) * ZONE_CONTEXT, W * ZONE_MIN)
    let h = Math.max((y1 - y0) * ZONE_CONTEXT, H * ZONE_MIN)
    // Misma proporción que la foto (el editor responde en proporciones fijas)
    if (w / h > W / H) h = (w * H) / W
    else w = (h * W) / H
    w = Math.min(W, Math.round(w))
    h = Math.min(H, Math.round(h))
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const left = Math.round(Math.min(Math.max(0, cx - w / 2), W - w))
    const top = Math.round(Math.min(Math.max(0, cy - h / 2), H - h))
    return { left, top, width: w, height: h }
  }
  // Une los objetos cuyas zonas se tocan
  const groups: Box[] = []
  for (const b of boxes) {
    const i = groups.findIndex((g) => overlaps(g, zoneFor(b)) || overlaps(b, zoneFor(g)))
    if (i === -1) groups.push([...b] as Box)
    else groups[i] = [Math.min(groups[i][0], b[0]), Math.min(groups[i][1], b[1]), Math.max(groups[i][2], b[2]), Math.max(groups[i][3], b[3])]
  }
  if (groups.length > MAX_ZONES) return null
  const zones = groups.map(zoneFor)
  if (zones.some((z) => z.width * z.height > W * H * ZONE_MAX_AREA)) return null
  return zones
}

// Año, marca, modelo y versión del vehículo que usa la foto (si ya está publicado)
async function vehicleNameForPhoto(url: string) {
  const image = await prisma.image.findFirst({
    where: { url },
    select: { vehicle: { select: { year: true, make: true, model: true, version: true } } },
  })
  const v = image?.vehicle
  return v ? [v.year, v.make, v.model, v.version].filter(Boolean).join(" ") : undefined
}

function roundCost(usd: number) {
  return Math.round(usd * 1e5) / 1e5
}

export async function processPhoto(originalUrl: string, gemini = newClient(), options: EditOptions = {}) {
  const uploads = path.join(process.cwd(), "public", "uploads") + path.sep
  const source = path.resolve(process.cwd(), "public", originalUrl.replace(/^\/+/, ""))
  if (!source.startsWith(uploads)) throw new Error("Ruta inválida")
  const img = await loadRaw(source)
  const { width: W, height: H } = img

  const detection = await gemini.detect(await downscaledJpeg(img, DETECT_SIDE), W, H)

  // Foto que con certeza no corresponde (no es un auto, contenido inapropiado): no se edita y se elimina del anuncio
  if (detection.discard) {
    return {
      status: "discarded",
      processedUrl: null,
      plateFound: false,
      removedItems: [],
      replacedPct: 0,
      options: {},
      suggestions: { dirt: false, glare: false, interior: false },
      flags: detection.flags,
      costUsd: roundCost(gemini.costUsd),
    }
  }

  // 1) Quitar personas y objetos (y, si el admin lo pidió, suciedad suelta o destello del sol).
  //    La IA edita la foto completa, pero solo se pegan las zonas detectadas.
  const labels = detection.items.map((i) => i.label)
  const itemBoxes = detection.items.map((i) => i.box)
  const retouchBoxes = [
    ...(options.clean ? cleanZones(detection, W, H) : []),
    ...(options.deglare ? glareZones(detection, W, H) : []),
  ]
  const boxes = [...itemBoxes, ...retouchBoxes]
  const vehicle = options.vehicle || (await vehicleNameForPhoto(originalUrl))
  const editOptions = { clean: !!options.clean && detection.interior, deglare: !!options.deglare, ...(vehicle && { vehicle }) }
  let replacedPct = 0
  if (boxes.length > 0) {
    // Solo objetos: se edita un recorte amplio alrededor de cada grupo (la IA ve la zona con mucho más detalle y
    // copia mejor las piezas vecinas). Con retoques de toda la foto, o muchos grupos, se edita la foto completa.
    const regions = retouchBoxes.length === 0 ? focusRegions(itemBoxes, W, H) : null
    const zones = regions ?? [{ left: 0, top: 0, width: W, height: H }]
    for (const zone of zones) {
      const full = zone.width === W && zone.height === H
      const target = full ? img : cropRaw(img, zone)
      const local = boxes
        .filter((b) => full || overlaps(b, zone))
        .map(([x0, y0, x1, y1]) => [x0 - zone.left, y0 - zone.top, x1 - zone.left, y1 - zone.top] as Box)
      const zoneLabels = full ? labels : detection.items.filter((i) => overlaps(i.box, zone)).map((i) => i.label)
      const input = await downscaledJpeg(target, EDIT_SIDE)
      const hidden = zoneLabels.length > 0 ? await gemini.describeHidden(input, zoneLabels, vehicle).catch(() => "") : ""
      // El editor a veces cambia el encuadre o redibuja la escena: se alinea y, si no empata, se reintenta una vez
      let edited: Buffer | null = null
      let align: Awaited<ReturnType<typeof alignEdit>> | null = null
      for (let attempt = 0; attempt < 2; attempt++) {
        edited = await gemini.edit(input, zoneLabels, { ...editOptions, hidden }, target.width, target.height)
        if (process.env.PHOTO_AI_DEBUG_DIR) {
          await fs.writeFile(path.join(process.env.PHOTO_AI_DEBUG_DIR, `${path.parse(originalUrl).name}-z${zone.left}-raw${attempt}.png`), edited)
        }
        align = await alignEdit(target, edited, local)
        if (align.residual <= MAX_RESIDUAL) break
      }
      if (!edited || !align || align.residual > MAX_RESIDUAL) {
        throw new Error(`La edición de la IA no coincide con la foto original (diferencia ${align?.residual.toFixed(1)})`)
      }
      const pct = await blendEdits(target, edited, local, align)
      replacedPct += (pct * target.width * target.height) / (W * H)
      if (!full) pasteRaw(img, target, zone)
    }
  }

  // 2) Placas de otros vehículos: se difuminan por código
  await blurBoxes(img, detection.otherPlates)

  // 3) Placa: se afinan las esquinas sobre un recorte y se pega la gráfica por código.
  let plateFound = false
  if (detection.plate) {
    const xs = detection.plate.map((p) => p[0]), ys = detection.plate.map((p) => p[1])
    const pw = Math.max(...xs) - Math.min(...xs), ph = Math.max(...ys) - Math.min(...ys)
    const left = Math.max(0, Math.floor(Math.min(...xs) - pw * 0.6))
    const top = Math.max(0, Math.floor(Math.min(...ys) - ph * 1.2))
    const width = Math.min(W, Math.ceil(Math.max(...xs) + pw * 0.6)) - left
    const height = Math.min(H, Math.ceil(Math.max(...ys) + ph * 1.2)) - top
    let corners = detection.plate
    if (width > 8 && height > 8) {
      const crop = await downscaledJpeg(img, DETECT_SIDE, { left, top, width, height })
      corners = (await gemini.refinePlate(crop, left, top, width, height)) ?? corners
    }
    await applyPlate(img, corners, PLATE_GRAPHIC)
    plateFound = true
  }

  const base = {
    // Cubierta por nosotros o ya traía la placa EasyMotores
    plateFound: plateFound || detection.plateIsOurs,
    removedItems: [...labels, ...detection.otherPlates.map(() => "placa de otro auto (difuminada)")],
    replacedPct: Math.round(replacedPct * 10) / 10,
    options: editOptions,
    suggestions: { dirt: detection.dirt.length > 0, glare: detection.glare.length > 0, interior: detection.interior },
    flags: detection.flags,
    costUsd: roundCost(gemini.costUsd),
  }
  // Sin placa ni cambios: no hay nada que revisar
  if (!plateFound && boxes.length === 0 && detection.otherPlates.length === 0) return { ...base, status: "unchanged", processedUrl: null }

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const filename = `${path.parse(originalUrl).name}-ai-${Date.now().toString(36)}.jpg`
  const target = path.join(OUTPUT_DIR, filename)
  await fs.writeFile(target, await encodeJpeg(img))
  // nginx (www-data) sirve /uploads
  await fs.chmod(target, 0o644)

  return { ...base, status: "ready", processedUrl: `/uploads/ai/${filename}` }
}
