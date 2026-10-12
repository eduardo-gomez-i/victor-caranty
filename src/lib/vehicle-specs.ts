import prisma from "@/lib/prisma"

export interface SpecInput {
  make: string
  model: string
  version?: string | null
  year: number
}

export interface Spec {
  tagline: string | null
  features: string[]
}

const MAX_FEATURES = 24
const MAX_TAGLINE = 200
const FEATURES_HEADING = /^(equipamiento|caracter[ií]sticas):?$/i
const BULLET = /^[•\-*]\s*/
// La transmisión es del auto concreto (la misma versión puede ser manual o automática), no de la ficha.
const TRANSMISSION = /^transmisi[oó]n\b/i

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// "Volkswagen|Jetta|Comfortline|2019" y "volkswagen | jetta | comfortline | 2019" comparten ficha.
export function specKey(v: SpecInput) {
  return [v.make, v.model, v.version ?? "", String(v.year)].map(normalize).join("|").slice(0, 190)
}

export function cleanFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return []
  return features
    .filter((f): f is string => typeof f === "string")
    .map((f) => f.trim().replace(BULLET, "").replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, MAX_FEATURES)
}

export function cleanTagline(tagline: unknown): string | null {
  if (typeof tagline !== "string") return null
  const text = tagline.trim().replace(/\s+/g, " ").slice(0, MAX_TAGLINE)
  return text || null
}

export async function findVerifiedSpec(v: SpecInput): Promise<Spec | null> {
  if (!v.version?.trim()) return null
  const spec = await prisma.vehicleSpec.findUnique({ where: { specKey: specKey(v) } })
  if (!spec?.verified) return null
  const features = withoutTransmission(cleanFeatures(spec.features))
  return features.length > 0 ? { tagline: spec.tagline, features } : null
}

// Guarda lo encontrado por la IA como candidato; nunca pisa una ficha verificada.
export async function saveCandidateSpec(v: SpecInput, spec: Spec, sources: string[]) {
  if (!v.version?.trim()) return
  const key = specKey(v)
  const existing = await prisma.vehicleSpec.findUnique({ where: { specKey: key } })
  if (existing?.verified) return
  const features = withoutTransmission(spec.features)
  await prisma.vehicleSpec.upsert({
    where: { specKey: key },
    create: { specKey: key, ...specFields(v), tagline: spec.tagline, features, sources, verified: false },
    update: { tagline: spec.tagline, features, sources },
  })
}

// Al aprobar un anuncio, el equipamiento revisado por el admin queda como ficha verificada.
export async function saveVerifiedSpecFromVehicle(vehicle: SpecInput & { description: string | null }) {
  if (!vehicle.version?.trim() || !vehicle.description) return
  const { tagline, features: parsed } = parseDescription(vehicle.description)
  const features = withoutTransmission(parsed)
  if (features.length === 0) return
  const key = specKey(vehicle)
  await prisma.vehicleSpec.upsert({
    where: { specKey: key },
    create: { specKey: key, ...specFields(vehicle), tagline, features, verified: true },
    update: { features, verified: true, ...(tagline && { tagline }) },
  })
}

function withoutTransmission(features: string[]) {
  return features.filter((f) => !TRANSMISSION.test(f))
}

function specFields(v: SpecInput) {
  return {
    make: v.make.trim().slice(0, 60),
    model: v.model.trim().slice(0, 80),
    version: (v.version ?? "").trim().slice(0, 100),
    year: v.year,
  }
}

// Lee una descripción con el formato generado: título, línea de km, frase de presentación,
// encabezado "CARACTERÍSTICAS:" y viñetas.
function parseDescription(description: string): Spec {
  const lines = description.split(/\r?\n/).map((l) => l.trim())
  const start = lines.findIndex((l) => FEATURES_HEADING.test(l))
  if (start === -1) return { tagline: null, features: [] }

  const intro = lines.slice(0, start).filter(Boolean)
  const tagline = intro.length >= 3 ? cleanTagline(intro[2]) : null

  const bullets: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (!line) {
      if (bullets.length > 0) break
      continue
    }
    if (!BULLET.test(line)) break
    bullets.push(line)
  }
  return { tagline, features: cleanFeatures(bullets) }
}
