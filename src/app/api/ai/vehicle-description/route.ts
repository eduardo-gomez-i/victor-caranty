import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"
import { TRANSMISSIONS } from "@/constants/vehicles"
import { cleanFeatures, cleanTagline, findVerifiedSpec, saveCandidateSpec, Spec } from "@/lib/vehicle-specs"

export const runtime = "nodejs"

const OPENAI_URL = "https://api.openai.com/v1/responses"
const DEFAULT_MODEL = "gpt-4.1-mini"
// Promedio por debajo del cual el cierre puede decir "kilometraje bajo para su año".
const LOW_KM_PER_YEAR = 12_000
// Tipos de VehicleTypeSelector que se nombran en femenino ("una camioneta").
const FEMININE_TYPES = new Set(["suv", "pickup", "minitruck"])

const inputSchema = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  version: z.string().trim().max(100).optional().default(""),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.coerce.number().int().min(0).max(5_000_000),
  transmission: z.enum(TRANSMISSIONS),
  invoiceType: z.string().trim().min(1).max(60),
  type: z.string().trim().max(50).optional().default(""),
})

type VehicleInput = z.infer<typeof inputSchema>

const INSTRUCTIONS = `Eres un experto en autos del mercado mexicano. Busca en la web la ficha técnica de la versión y año indicados EN MÉXICO.
Fuentes en orden de preferencia: sitio oficial de la marca en México (.com.mx), fichas técnicas o pruebas de manejo de medios mexicanos (autocosmos.com.mx, motorpasion.com.mx, autoproyecto.com.mx, autodato.com). Evita anuncios de autos usados y fuentes de otros países (Estados Unidos, Canadá, Brasil, España): el equipamiento cambia entre mercados.
Incluye "México" o "site:.com.mx" en tus búsquedas.

Responde SOLO con JSON {"tagline": string, "transmissions": string[], "features": string[], "sources": string[]} sin texto adicional.

tagline: una frase corta (máx. 15 palabras) que presente el vehículo por su tipo y uso, en el tono de un vendedor de autos. Ej.: "Una SUV moderna, cómoda y muy bien equipada, ideal para ciudad y carretera." No menciones estado, dueños, kilometraje ni precio.

transmissions: TODAS las transmisiones que se ofrecieron para esa versión y año en México, con tipo y velocidades (ej. ["Transmisión manual 6 velocidades", "Transmisión automática Tiptronic 6 velocidades"]). Vacío si no está confirmado.

features: hasta 22 elementos cortos (máx. 8 palabras), sin punto final y SIN la transmisión.
La lista siguiente es solo el ORDEN, no una lista a llenar: incluye un elemento únicamente si la fuente confirma que esa versión y año lo trae de serie. Es mejor 10 elementos correctos que 22 dudosos. Las versiones de entrada y medias suelen no traer techo panorámico, acceso sin llave, faros LED ni asistencias avanzadas; no los incluyas sin confirmación.
No uses elementos vagos como "Asistencias de seguridad" o "Paquete Premier": nombra la función concreta o omítelo.
Orden:
motor (cilindrada, cilindros o turbo, hp), tracción, rines (material y medida), techo panorámico o quemacocos, acceso sin llave y botón de encendido, vestiduras y ajustes de asientos, clima, volante multifunción, control de crucero, pantalla (medida), Apple CarPlay / Android Auto, Bluetooth y USB, audio (bocinas o marca), cámara de reversa o 360°, sensores de estacionamiento, asistencias (punto ciego, crucero adaptativo, etc.), bolsas de aire (número), frenos ABS + EBD, control de estabilidad, control de presión de llantas, ISOFIX, asientos traseros abatibles, faros LED, paquetes de la versión.
- Escribe como en este ejemplo: "Motor 1.5L 4 cilindros", "Rines de aluminio de 16”", "Pantalla táctil de 8”", "4 bolsas de aire", "Frenos ABS + EBD".
- Incluye solo equipamiento de serie confirmado para esa versión y año en México. Si un dato no está confirmado, omítelo o escríbelo sin la cifra (ej. "Rines de aluminio").
- Si no se indica versión, usa solo el equipamiento común a todas las versiones de ese modelo y año.
- Nada de precio, contacto, estado del auto ni emojis.

sources: URLs que realmente consultaste.`

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Completa marca, modelo, año, kilometraje, transmisión y tipo de factura" },
      { status: 400 }
    )
  }
  const v = parsed.data

  try {
    const verified = await findVerifiedSpec(v)
    if (verified) {
      return NextResponse.json({
        description: buildDescription(v, verified, []),
        source: "catalog",
        sources: [],
      })
    }
  } catch (error) {
    console.error("Lookup de vehicle_specs falló:", error)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("OPENAI_API_KEY no configurada")
    return NextResponse.json({ error: "La generación con IA no está disponible" }, { status: 503 })
  }

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        tools: [{ type: "web_search", user_location: { type: "approximate", country: "MX" } }],
        instructions: INSTRUCTIONS,
        input: JSON.stringify({
          marca: v.make,
          modelo: v.model,
          version: v.version || null,
          año: v.year,
        }),
        max_output_tokens: 1200,
      }),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      console.error("OpenAI error:", res.status, await res.text().catch(() => ""))
      return NextResponse.json({ error: "No se pudo generar la descripción" }, { status: 502 })
    }

    const { spec, transmissions, sources } = parseResult(await res.json())
    // "Paquete Comfortline" en un Jetta Comfortline no aporta nada; "Paquete R-Line" en otra versión sí.
    const redundantPackage = `paquete ${v.version}`.trim().toLowerCase()
    spec.features = spec.features.filter((f) => f.toLowerCase() !== redundantPackage)
    if (spec.features.length === 0) {
      return NextResponse.json({ error: "No se pudo generar la descripción" }, { status: 502 })
    }

    try {
      await saveCandidateSpec(v, spec, sources)
    } catch (error) {
      console.error("No se pudo guardar vehicle_spec candidata:", error)
    }

    return NextResponse.json({
      description: buildDescription(v, spec, transmissions),
      source: "web",
      sources,
    })
  } catch (error) {
    console.error("POST /api/ai/vehicle-description error:", error)
    return NextResponse.json({ error: "No se pudo generar la descripción" }, { status: 502 })
  }
}

interface ResponsesOutput {
  output?: { type: string; content?: { type: string; text?: string }[] }[]
}

function parseResult(data: ResponsesOutput) {
  const empty = { spec: { tagline: null, features: [] } as Spec, transmissions: [] as string[], sources: [] as string[] }
  const text = (data.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("\n")

  // El modelo a veces envuelve el JSON en texto o en ```json; tomamos el primer objeto.
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end <= start) return empty

  try {
    const json = JSON.parse(text.slice(start, end + 1))
    const sources = Array.isArray(json?.sources)
      ? json.sources
          .filter((s: unknown): s is string => typeof s === "string" && /^https?:\/\//.test(s))
          .map((s: string) => s.replace(/[?&]utm_source=openai$/, ""))
          .slice(0, 5)
      : []
    return {
      spec: { tagline: cleanTagline(json?.tagline), features: cleanFeatures(json?.features) },
      transmissions: cleanFeatures(json?.transmissions),
      sources,
    }
  } catch {
    return empty
  }
}

const AUTOMATIC = /autom|cvt|tiptronic|dsg|doble embrague|dct|steptronic|xtronic|ivt/i

// La transmisión la indica el vendedor. Si la IA encontró una sola de ese tipo para la versión,
// usamos su detalle (ej. "Transmisión automática CVT"); si no, el texto genérico.
function transmissionLine(selected: VehicleInput["transmission"], found: string[]) {
  const wantsAutomatic = selected === "Automática"
  const matches = found.filter((t) => AUTOMATIC.test(t) === wantsAutomatic)
  if (matches.length === 1) {
    const detail = matches[0]
    return /^transmisi[oó]n\b/i.test(detail) ? detail : `Transmisión ${detail.charAt(0).toLowerCase()}${detail.slice(1)}`
  }
  return wantsAutomatic ? "Transmisión automática" : "Transmisión manual"
}

function closingLine(v: VehicleInput) {
  const age = Math.max(1, new Date().getFullYear() - v.year)
  const lowKm = v.mileage / age < LOW_KM_PER_YEAR
  const name = [v.model, v.version].filter(Boolean).join(" ")

  if (!v.type) {
    return lowKm ? "Equipamiento completo y kilometraje bajo para su año." : null
  }
  const feminine = FEMININE_TYPES.has(v.type)
  const article = feminine ? "Una" : "Un"
  const complete = feminine ? "muy completa" : "muy completo"
  const equipped = feminine ? "bien equipada" : "bien equipado"
  return lowKm
    ? `${article} ${name} ${complete} y con kilometraje bajo para su año.`
    : `${article} ${name} ${complete} y ${equipped}.`
}

// Todo lo que aporta el vendedor (título, km, transmisión, factura) se arma aquí, no en el modelo,
// para que siempre sea exacto. La IA solo aporta la frase de presentación y el equipamiento.
function buildDescription(v: VehicleInput, spec: Spec, transmissions: string[]) {
  const title = [v.make, v.model, v.version, v.year].filter(Boolean).join(" ").toUpperCase()
  const km = v.mileage.toLocaleString("es-MX")
  const transmissionLabel = v.transmission === "Automática" ? "AUTOMÁTICO" : "MANUAL"

  const features = [...spec.features]
  const afterEngine = /^motor\b/i.test(features[0] ?? "") ? 1 : 0
  features.splice(afterEngine, 0, transmissionLine(v.transmission, transmissions))

  const closing = closingLine(v)
  return [
    `🚙 ${title}`,
    `✨ ${km} KM | ${transmissionLabel} | ${v.invoiceType.toUpperCase()}`,
    ...(spec.tagline ? [spec.tagline] : []),
    "",
    "CARACTERÍSTICAS:",
    ...features.map((f) => `- ${f}`),
    "",
    `📄 ${v.invoiceType}`,
    `📍 ${km} km`,
    ...(closing ? [closing] : []),
  ].join("\n")
}
