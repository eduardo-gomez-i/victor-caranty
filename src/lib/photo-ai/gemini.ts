import { FLAG_KEYS, PhotoFlag } from "./flags"

const API = "https://generativelanguage.googleapis.com/v1beta/models"
const DETECT_MODEL = "gemini-3.8-flash"
const DEFAULT_EDIT_MODEL = "gemini-3.1-flash-image"

// USD por 1M tokens (lista de precios de Gemini API, oct 2026). Solo para registrar el costo aproximado.
const PRICES: Record<string, { input: number; output: number; imageOutput: number }> = {
  "gemini-3.8-flash": { input: 0.75, output: 3.75, imageOutput: 0 },
  "gemini-3.1-flash-image": { input: 0.5, output: 3, imageOutput: 60 },
  "gemini-3.1-flash-lite-image": { input: 0.25, output: 1.5, imageOutput: 30 },
}

export type Point = [number, number]

export type Box = [number, number, number, number] // x0, y0, x1, y1 en px



export interface Detection {
  // Esquinas de la placa en px de la imagen enviada: sup-izq, sup-der, inf-der, inf-izq
  plate: Point[] | null
  // La foto ya trae la placa de EasyMotores (no se reemplaza)
  plateIsOurs: boolean
  items: { label: string; box: Box }[]
  // Placas de otros vehículos que aparecen en la foto (privacidad): se difuminan por código
  otherPlates: Box[]
  // Problemas de contenido; la foto queda oculta hasta que la apruebe un admin
  flags: PhotoFlag[]
  // La IA está segura de que la foto no corresponde (no es un auto o es inapropiada): se elimina del anuncio
  discard: boolean
  interior: boolean
  // Zonas con suciedad suelta (solo interiores) y zonas afectadas por el sol; se usan solo si el admin lo pide
  dirt: Box[]
  glare: Box[]
}

// Retoques opcionales que pide el admin
export interface EditOptions {
  clean?: boolean
  deglare?: boolean
  // Año, marca y modelo del auto: ayuda a reconstruir fielmente lo que tapaba un objeto
  vehicle?: string
}

const DETECT_PROMPT = `This is a photo of a used car for sale. Return JSON only:
{"plate": {"found": bool, "easymotores": bool, "corners": [[y,x],[y,x],[y,x],[y,x]]},
 "items": [{"label": str, "box_2d": [ymin, xmin, ymax, xmax]}],
 "other_plates": [[ymin, xmin, ymax, xmax]],
 "flags": {"contact_info": bool, "watermark": bool, "not_car": bool, "inappropriate": bool},
 "sure": {"not_car": bool, "inappropriate": bool},
 "interior": bool,
 "dirt": [[ymin, xmin, ymax, xmax]],
 "glare": [[ymin, xmin, ymax, xmax]]}
plate: the car's license plate, 4 outer corners including its frame, in order top-left, top-right, bottom-right, bottom-left. easymotores: true if that plate is already an EasyMotores plate (white plate with the blue E logo and the text EasyMotores) instead of a real license plate.
items: every thing that must be removed before publishing: loose objects that are NOT part of the car (trash, bottles, cans, paper, tissues, rags, clothes, bags, backpacks, boxes, tape, toys, brochures, cables, tools, shoes), loose papers, notes, tickets or signs placed on or behind the windshield or on the dashboard, and any people. Do NOT list car parts or accessories that belong to the car (seats, seat belts, buckles, floor mats, cargo cover, headrests, trim), other parked cars, nor stains, wear or damage. Use short, specific labels in Spanish (e.g. "botella de agua", "persona", "mochila", "papel en el parabrisas"). Each box_2d must cover the WHOLE object including everything attached to it (straws, lids, handles, cables, tags) and its shadow, with a small margin.
other_plates: license plates of OTHER vehicles in the photo (not the car being sold), even small or partly visible. Empty if none.
flags (content moderation for a car marketplace):
- contact_info: phone numbers, emails, websites or social media handles written anywhere in the photo (signs like "se vende" with a number, stickers, text overlays). A license plate is NOT contact info. The EasyMotores / EasyMotores.com plate, sticker or logo is our own brand: it is NOT contact_info nor watermark.
- watermark: logos, watermarks or text overlays from other websites, marketplaces, dealers or apps added on top of the photo.
- not_car: the photo is not of a car (or its parts/interior), e.g. a meme, a screenshot, a person, a document.
- inappropriate: nudity, violence, offensive gestures or symbols.
sure: whether you are completely certain of that flag, with no doubt at all. sure.not_car is true only if no car, car part or car interior appears anywhere in the photo (e.g. people dancing in a room, a meme, a document, a landscape); if a car might be visible or the photo is unclear, false. sure.inappropriate is true only for unmistakable cases. Both false when the flag is false.
interior: true if the photo shows the inside of the car (cabin, seats, trunk).
dirt: only for interior photos, regions with LOOSE dirt that a vacuum or a cloth would remove: dust, soil, mud, crumbs, hair, lint, leaves, small debris on mats, carpet, seats or trim. Do NOT include stains, discoloration, wear, cracks, tears or burns. Empty if none.
glare: regions where sun rays, lens flare or strong sun haze wash out the image. Empty if none.
All coordinates normalized 0-1000 relative to the image. Be precise.`

const PLATE_PROMPT = `Find the vehicle license plate in this image. Return JSON only: {"found": bool, "corners": [[y,x],[y,x],[y,x],[y,x]]} with the 4 outer corners of the plate (including its frame) in order top-left, top-right, bottom-right, bottom-left, coordinates normalized 0-1000 relative to the image. Be as precise as possible.`

const CLEAN_PROMPT =
  "Also clean the LOOSE dirt on the floor mats, carpet, seats and trim: dust, soil, mud, crumbs, hair, lint, leaves " +
  "and small debris, as if the interior had just been vacuumed. Do NOT remove, lighten or hide stains, " +
  "discoloration, wear, cracks, tears, burns or scratches: they are the real condition of the car and must stay exactly as they are. "

const DEGLARE_PROMPT =
  "Also reduce the sun rays, lens flare and sun haze so the car is clearly visible, keeping natural daylight, " +
  "the same sky, colors and shadows. Do not change the car's paint, shape, damage or details. "

function editPrompt(items: string[], options: EditOptions) {
  const parts: string[] = []
  if (items.length > 0) {
    parts.push(
      `Remove ONLY these items from the photo: ${items.join(", ")}. ` +
        "Remove each item completely, including anything attached to it (straws, lids, cables). " +
        "Fill each area with what is really behind it, continuing its exact texture, color and lighting " +
        "(carpet, leather, plastic, ground). " +
        "Where an item covered part of the car (cup holders, console, buttons, vents, seats, mats, door panels), rebuild " +
        "that part exactly as it is on this car: copy its shape, size, material and details from the identical or " +
        "symmetric parts still visible in the photo (for example, the cup holder next to it, the other seat, the other " +
        "side of the console). Never invent new shapes, buttons, inserts or textures. "
    )
    if (options.vehicle) {
      parts.push(`The car is a ${options.vehicle}; the rebuilt parts must match that model's real interior and exterior. `)
    }
  }
  if (options.clean) parts.push(CLEAN_PROMPT)
  if (options.deglare) parts.push(DEGLARE_PROMPT)
  parts.push(
    "Keep every existing stain, scratch, wrinkle and sign of wear. " +
      "Do not change anything else: same framing, perspective, colors and sharpness. " +
      "Do not retouch or beautify the car."
  )
  return parts.join("")
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; inlineData?: { data: string }; inline_data?: { data: string } }[] } }[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
    candidatesTokensDetails?: { modality: string; tokenCount: number }[]
  }
}

export class GeminiClient {
  costUsd = 0

  constructor(private apiKey: string, private editModel = DEFAULT_EDIT_MODEL) {}

  private async call(model: string, body: unknown): Promise<GeminiResponse> {
    const res = await fetch(`${API}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    })
    if (!res.ok) {
      throw new Error(`Gemini ${model} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`)
    }
    const data = (await res.json()) as GeminiResponse
    this.addCost(model, data)
    return data
  }

  private addCost(model: string, data: GeminiResponse) {
    const price = PRICES[model]
    const u = data.usageMetadata
    if (!price || !u) return
    const imageOut = (u.candidatesTokensDetails ?? [])
      .filter((d) => d.modality === "IMAGE")
      .reduce((sum, d) => sum + d.tokenCount, 0)
    const textOut = (u.candidatesTokenCount ?? 0) - imageOut + (u.thoughtsTokenCount ?? 0)
    this.costUsd +=
      ((u.promptTokenCount ?? 0) * price.input + textOut * price.output + imageOut * price.imageOutput) / 1e6
  }

  private async askJson<T>(jpeg: Buffer, prompt: string): Promise<T> {
    const data = await this.call(DETECT_MODEL, {
      contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: jpeg.toString("base64") } }, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    })
    const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text
    if (!text) throw new Error("Gemini no devolvió texto")
    return JSON.parse(text) as T
  }

  // jpeg: imagen reducida; width/height: tamaño de la foto real al que se escalan las coordenadas
  async detect(jpeg: Buffer, width: number, height: number): Promise<Detection> {
    const raw = await this.askJson<{
      plate?: { found?: boolean; easymotores?: boolean; corners?: number[][] }
      items?: { label?: string; box_2d?: number[] }[]
      other_plates?: number[][]
      flags?: Record<string, unknown>
      sure?: Record<string, unknown>
      interior?: boolean
      dirt?: number[][]
      glare?: number[][]
    }>(jpeg, DETECT_PROMPT)

    // Una placa EasyMotores que ya trae la foto se conserva: se ve más natural que reemplazarla
    const plateIsOurs = raw.plate?.found === true && raw.plate.easymotores === true
    const plate = raw.plate?.found && !plateIsOurs ? toPoints(raw.plate.corners, 0, 0, width, height) : null
    const items = (raw.items ?? [])
      .filter((i) => Array.isArray(i.box_2d) && i.box_2d.length === 4)
      .map((i) => {
        return {
          label: String(i.label || "object").slice(0, 60),
          box: toBox(i.box_2d as number[], width, height),
        }
      })
      .filter((i) => validBox(i.box))
    const boxes = (list?: number[][]) =>
      (Array.isArray(list) ? list : [])
        .filter((b) => Array.isArray(b) && b.length === 4)
        .map((b) => toBox(b, width, height))
        .filter(validBox)
    const interior = raw.interior === true
    const flags = FLAG_KEYS.filter((k) => raw.flags?.[k] === true)
    const sure = (k: PhotoFlag) => flags.includes(k) && raw.sure?.[k] === true
    return {
      plate,
      plateIsOurs,
      items,
      otherPlates: boxes(raw.other_plates),
      flags,
      discard: sure("not_car") || sure("inappropriate"),
      interior,
      dirt: interior ? boxes(raw.dirt) : [],
      glare: boxes(raw.glare),
    }
  }

  // Segunda pasada sobre un recorte alrededor de la placa para afinar las esquinas.
  async refinePlate(cropJpeg: Buffer, left: number, top: number, width: number, height: number) {
    const raw = await this.askJson<{ found?: boolean; corners?: number[][] }>(cropJpeg, PLATE_PROMPT)
    return raw.found ? toPoints(raw.corners, left, top, width, height) : null
  }

  // Devuelve la foto editada (resolución 1K) en el aspecto más cercano al original.
  async edit(jpeg: Buffer, items: string[], options: EditOptions, width: number, height: number): Promise<Buffer> {
    const data = await this.call(this.editModel, {
      contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: jpeg.toString("base64") } }, { text: editPrompt(items, options) }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: closestRatio(width / height), imageSize: "1K" },
      },
    })
    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      const inline = part.inlineData ?? part.inline_data
      if (inline?.data) return Buffer.from(inline.data, "base64")
    }
    throw new Error("Gemini no devolvió imagen editada")
  }
}

function toBox([y0, x0, y1, x1]: number[], width: number, height: number): Box {
  return [(x0 / 1000) * width, (y0 / 1000) * height, (x1 / 1000) * width, (y1 / 1000) * height]
}

function validBox(b: Box) {
  return b.every(Number.isFinite) && b[2] > b[0] && b[3] > b[1]
}

function toPoints(corners: number[][] | undefined, left: number, top: number, width: number, height: number) {
  if (!Array.isArray(corners) || corners.length !== 4) return null
  const points = corners.map(([y, x]) => [left + (x / 1000) * width, top + (y / 1000) * height] as Point)
  return points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) ? points : null
}

const RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"]

function closestRatio(ratio: number) {
  return RATIOS.reduce((best, r) => {
    const [a, b] = r.split(":").map(Number)
    const [ba, bb] = best.split(":").map(Number)
    return Math.abs(a / b - ratio) < Math.abs(ba / bb - ratio) ? r : best
  })
}
