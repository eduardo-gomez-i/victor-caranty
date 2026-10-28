import sharp from "sharp"
import type { Point } from "./gemini"

// Foto en memoria: RGB sin compresión, ya rotada según EXIF.
export interface RawImage {
  data: Buffer
  width: number
  height: number
}

const BOX_MARGIN = 0.08 // margen alrededor de cada objeto para cubrir sombra de contacto y bordes
const MASK_FEATHER = 10 // sigma del borde suave entre foto original y zona reconstruida
const PLATE_EXPAND = 0.04 // agranda la placa nueva para tapar el marco de la original
const PLATE_GRAIN = 4 // desviación del ruido que imita el grano de la foto

export async function loadRaw(input: Buffer | string): Promise<RawImage> {
  const { data, info } = await sharp(input).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

export interface Region {
  left: number
  top: number
  width: number
  height: number
}

// Copia una región de la foto (para editar solo la zona de los objetos con más detalle)
export function cropRaw(img: RawImage, r: Region): RawImage {
  const data = Buffer.alloc(r.width * r.height * 3)
  for (let y = 0; y < r.height; y++) {
    const from = ((r.top + y) * img.width + r.left) * 3
    img.data.copy(data, y * r.width * 3, from, from + r.width * 3)
  }
  return { data, width: r.width, height: r.height }
}

// Devuelve la región editada a su lugar en la foto completa
export function pasteRaw(img: RawImage, part: RawImage, r: Region) {
  for (let y = 0; y < r.height; y++) {
    part.data.copy(img.data, ((r.top + y) * img.width + r.left) * 3, y * r.width * 3, (y + 1) * r.width * 3)
  }
}

export function encodeJpeg(img: RawImage, quality = 92) {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: 3 } }).jpeg({ quality, mozjpeg: true }).toBuffer()
}

export function downscaledJpeg(img: RawImage, maxSide: number, crop?: { left: number; top: number; width: number; height: number }) {
  let s = sharp(img.data, { raw: { width: img.width, height: img.height, channels: 3 } })
  if (crop) s = s.extract(crop)
  return s.resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer()
}

type Box = [number, number, number, number]

// Transformación foto original -> imagen editada: u = scale * x + dx, v = scale * y + dy
interface Alignment {
  scale: number
  dx: number
  dy: number
  // diferencia media de gris (0-255) fuera de los objetos tras alinear; alto = la IA cambió la escena
  residual: number
}

// El editor puede devolver la foto con otro encuadre (zoom o desplazamiento). Se busca la escala y el
// desplazamiento que mejor empatan ambas imágenes fuera de las zonas de objetos, de grueso a fino.
export async function alignEdit(img: RawImage, edited: Buffer, boxes: Box[]): Promise<Alignment> {
  const { width: W, height: H } = img
  const meta = await sharp(edited).metadata()
  const ew = meta.width!, eh = meta.height!

  const level = async (width: number) => {
    const k = width / W
    const ow = width, oh = Math.round(H * k)
    const o = await sharp(img.data, { raw: { width: W, height: H, channels: 3 } }).resize(ow, oh, { fit: "fill" }).greyscale().extractChannel(0).raw().toBuffer()
    const kw = Math.round(ew * k), kh = Math.round(eh * k)
    const e = await sharp(edited).resize(kw, kh, { fit: "fill" }).greyscale().extractChannel(0).raw().toBuffer()
    // Puntos de comparación fuera de las cajas (con margen)
    const points: number[] = []
    const step = Math.max(1, Math.round(ow / 64))
    for (let y = 0; y < oh; y += step) {
      for (let x = 0; x < ow; x += step) {
        const fx = x / k, fy = y / k
        const inBox = boxes.some(([x0, y0, x1, y1]) => {
          const m = 0.15 * Math.max(x1 - x0, y1 - y0)
          return fx > x0 - m && fx < x1 + m && fy > y0 - m && fy < y1 + m
        })
        if (!inBox) points.push(x, y)
      }
    }
    const error = (scale: number, dx: number, dy: number) => {
      let sum = 0, n = 0
      for (let i = 0; i < points.length; i += 2) {
        const u = Math.round(scale * points[i] + dx), v = Math.round(scale * points[i + 1] + dy)
        if (u < 0 || v < 0 || u >= kw || v >= kh) continue
        sum += Math.abs(o[points[i + 1] * ow + points[i]] - e[v * kw + u])
        n++
      }
      // Penaliza alineaciones que dejan fuera gran parte de la foto
      return n < points.length / 4 ? Infinity : sum / n + (1 - (2 * n) / points.length) * 40
    }
    return { k, error }
  }

  // Nivel grueso: 128 px de ancho
  const coarse = await level(128)
  const base = ew / W // encuadre "estirado" que se supone por defecto
  let best = { scale: base, dx: 0, dy: 0, err: Infinity }
  for (let s = base * 0.85; s <= base * 1.25; s += base * 0.01) {
    for (let dx = -0.25 * 128 * base; dx <= 0.25 * 128 * base; dx += 1) {
      for (let dy = -0.25 * 128 * base; dy <= 0.25 * 128 * base; dy += 1) {
        const err = coarse.error(s, dx, dy)
        if (err < best.err) best = { scale: s, dx, dy, err }
      }
    }
  }
  // Nivel fino: 512 px, alrededor del mejor resultado
  const fine = await level(512)
  const f = 512 / 128
  let refined = { scale: best.scale, dx: best.dx * f, dy: best.dy * f, err: Infinity }
  const center = { ...refined }
  for (let s = center.scale * 0.985; s <= center.scale * 1.015; s += center.scale * 0.0025) {
    for (let dx = center.dx - 5; dx <= center.dx + 5; dx += 1) {
      for (let dy = center.dy - 5; dy <= center.dy + 5; dy += 1) {
        const err = fine.error(s, dx, dy)
        if (err < refined.err) refined = { scale: s, dx, dy, err }
      }
    }
  }
  // Pasar de coordenadas reducidas a pixeles reales (misma escala k en ambas imágenes)
  return { scale: refined.scale, dx: refined.dx / fine.k, dy: refined.dy / fine.k, residual: refined.err }
}

// Pega la edición de la IA SOLO dentro de las cajas de los objetos; fuera de ellas la foto queda intacta.
// Devuelve el % de la foto reemplazado.
export async function blendEdits(img: RawImage, edited: Buffer, boxes: Box[], align: Alignment) {
  const { width: W, height: H } = img
  const { data: ai, info } = await sharp(edited).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ew = info.width, eh = info.height

  const mask = Buffer.alloc(W * H)
  for (const [x0, y0, x1, y1] of boxes) {
    const m = BOX_MARGIN * Math.max(x1 - x0, y1 - y0)
    const left = clamp(Math.floor(x0 - m), 0, W), right = clamp(Math.ceil(x1 + m), 0, W)
    const top = clamp(Math.floor(y0 - m), 0, H), bottom = clamp(Math.ceil(y1 + m), 0, H)
    for (let y = top; y < bottom; y++) mask.fill(255, y * W + left, y * W + right)
  }
  const soft = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(MASK_FEATHER).extractChannel(0).raw().toBuffer()

  let replaced = 0
  for (let i = 0; i < W * H; i++) {
    const a = soft[i]
    if (a === 0) continue
    if (a > 128) replaced++
    const x = i % W, y = (i - x) / W
    // Muestreo bilineal de la edición en la posición alineada
    const u = clamp(align.scale * (x + 0.5) + align.dx - 0.5, 0, ew - 1)
    const v = clamp(align.scale * (y + 0.5) + align.dy - 0.5, 0, eh - 1)
    const u0 = Math.floor(u), v0 = Math.floor(v)
    const u1 = Math.min(u0 + 1, ew - 1), v1 = Math.min(v0 + 1, eh - 1)
    const fu = u - u0, fv = v - v0
    const p = i * 3
    for (let c = 0; c < 3; c++) {
      const top = ai[(v0 * ew + u0) * 3 + c] * (1 - fu) + ai[(v0 * ew + u1) * 3 + c] * fu
      const bottom = ai[(v1 * ew + u0) * 3 + c] * (1 - fu) + ai[(v1 * ew + u1) * 3 + c] * fu
      const value = top * (1 - fv) + bottom * fv
      img.data[p + c] = (value * a + img.data[p + c] * (255 - a)) / 255
    }
  }
  return (replaced / (W * H)) * 100
}

// Cubre la placa con la gráfica de Easy Motores ajustada a la perspectiva (sin IA generativa).
export async function applyPlate(img: RawImage, corners: Point[], platePath: string) {
  const { width: W, height: H } = img
  const quad = expand(corners, PLATE_EXPAND)
  const { data: plate, info } = await sharp(platePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pw = info.width, ph = info.height

  // Homografía de la foto hacia la placa (para muestrear cada pixel destino)
  const h = homography(quad, [[0, 0], [pw, 0], [pw, ph], [0, ph]])
  const left = clamp(Math.floor(Math.min(...quad.map((p) => p[0]))) - 2, 0, W)
  const right = clamp(Math.ceil(Math.max(...quad.map((p) => p[0]))) + 2, 0, W)
  const top = clamp(Math.floor(Math.min(...quad.map((p) => p[1]))) - 2, 0, H)
  const bottom = clamp(Math.ceil(Math.max(...quad.map((p) => p[1]))) + 2, 0, H)
  const bw = right - left, bh = bottom - top
  if (bw < 4 || bh < 4) return

  const tint = plateTint(img, quad)
  const layer = Buffer.alloc(bw * bh * 4)
  const rand = gaussian(7)
  const sub = [0.25, 0.75]
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      // 2x2 submuestras para bordes suaves
      let r = 0, g = 0, b = 0, a = 0
      for (const sy of sub) for (const sx of sub) {
        const [u, v] = project(h, left + x + sx, top + y + sy)
        const s = sample(plate, pw, ph, u, v)
        r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3]
      }
      const o = (y * bw + x) * 4
      if (a === 0) continue
      const noise = rand() * PLATE_GRAIN
      layer[o] = clamp((r / a) * tint[0] + noise, 0, 255)
      layer[o + 1] = clamp((g / a) * tint[1] + noise, 0, 255)
      layer[o + 2] = clamp((b / a) * tint[2] + noise, 0, 255)
      layer[o + 3] = a / 4
    }
  }
  // Ligero desenfoque para igualar la nitidez de la foto
  const soft = await sharp(layer, { raw: { width: bw, height: bh, channels: 4 } }).blur(0.6).raw().toBuffer()
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const o = (y * bw + x) * 4
      const a = soft[o + 3]
      if (a === 0) continue
      const p = ((top + y) * W + left + x) * 3
      for (let c = 0; c < 3; c++) img.data[p + c] = (soft[o + c] * a + img.data[p + c] * (255 - a)) / 255
    }
  }
}

// Color del blanco más claro alrededor de la placa (pintura, marco, la propia placa), por canal: así la placa
// nueva toma la luz y el tono de la escena (sombra azulada, sol cálido) y no se ve "pegada" ni beige.
function plateTint(img: RawImage, quad: Point[]): [number, number, number] {
  const area = expand(quad, 0.8)
  const xs = area.map((p) => p[0]), ys = area.map((p) => p[1])
  const x0 = clamp(Math.floor(Math.min(...xs)), 0, img.width - 1), x1 = clamp(Math.ceil(Math.max(...xs)), 0, img.width - 1)
  const y0 = clamp(Math.floor(Math.min(...ys)), 0, img.height - 1), y1 = clamp(Math.ceil(Math.max(...ys)), 0, img.height - 1)
  const step = Math.max(1, Math.round((x1 - x0) / 120))
  const pixels: [number, number, number, number][] = []
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      if (!inside(area, x, y)) continue
      const p = (y * img.width + x) * 3
      const r = img.data[p], g = img.data[p + 1], b = img.data[p + 2]
      pixels.push([0.299 * r + 0.587 * g + 0.114 * b, r, g, b])
    }
  }
  if (pixels.length === 0) return [1, 1, 1]
  // Promedio del 5% más claro, ignorando reflejos quemados
  pixels.sort((a, b) => b[0] - a[0])
  const start = Math.floor(pixels.length * 0.01)
  const top = pixels.slice(start, start + Math.max(1, Math.floor(pixels.length * 0.05)))
  const mean = [1, 2, 3].map((c) => top.reduce((sum, px) => sum + px[c], 0) / top.length)
  // Escala general por el más claro, limitada; el tinte por canal se conserva pero suavizado
  const peak = Math.max(...mean)
  const scale = clamp(peak / 255, 0.6, 1)
  return mean.map((v) => scale * (0.5 + 0.5 * (v / peak))) as [number, number, number]
}

function expand(points: Point[], pct: number): Point[] {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length
  return points.map(([x, y]) => [cx + (x - cx) * (1 + pct), cy + (y - cy) * (1 + pct)])
}

// Resuelve la homografía que lleva src -> dst (8 incógnitas, eliminación gaussiana).
function homography(src: Point[], dst: Point[]) {
  const A: number[][] = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }
  for (let c = 0; c < 8; c++) {
    let pivot = c
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[pivot][c])) pivot = r
    ;[A[c], A[pivot]] = [A[pivot], A[c]]
    for (let r = 0; r < 8; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]
    }
  }
  return A.map((row, i) => row[8] / row[i])
}

function project(h: number[], x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + 1
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]
}

// Muestreo bilineal RGBA; fuera de la placa devuelve transparente.
function sample(buf: Buffer, w: number, h: number, u: number, v: number) {
  if (u < 0 || v < 0 || u >= w || v >= h) return [0, 0, 0, 0]
  const x0 = Math.min(Math.floor(u), w - 1), y0 = Math.min(Math.floor(v), h - 1)
  const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1)
  const fx = u - x0, fy = v - y0
  const out = [0, 0, 0, 0]
  for (let c = 0; c < 4; c++) {
    const a = buf[(y0 * w + x0) * 4 + c], b = buf[(y0 * w + x1) * 4 + c]
    const d = buf[(y1 * w + x0) * 4 + c], e = buf[(y1 * w + x1) * 4 + c]
    out[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy
  }
  return out
}

function inside(poly: Point[], x: number, y: number) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

// Ruido gaussiano determinista (Box-Muller sobre un LCG) para que reprocesar dé el mismo grano.
function gaussian(seed: number) {
  let s = seed
  const next = () => ((s = (s * 1664525 + 1013904223) % 4294967296) + 1) / 4294967297
  return () => Math.sqrt(-2 * Math.log(next())) * Math.cos(2 * Math.PI * next())
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// Difumina las placas de otros vehículos (privacidad). Por código: no cambia nada fuera de cada placa.
export async function blurBoxes(img: RawImage, boxes: Box[]) {
  const { width: W, height: H } = img
  for (const [x0, y0, x1, y1] of boxes) {
    const m = 0.2 * Math.max(x1 - x0, y1 - y0)
    const left = clamp(Math.floor(x0 - m), 0, W - 1), right = clamp(Math.ceil(x1 + m), left + 1, W)
    const top = clamp(Math.floor(y0 - m), 0, H - 1), bottom = clamp(Math.ceil(y1 + m), top + 1, H)
    const bw = right - left, bh = bottom - top
    if (bw < 2 || bh < 2) continue
    const region = sharp(img.data, { raw: { width: W, height: H, channels: 3 } }).extract({ left, top, width: bw, height: bh })
    const sigma = Math.max(3, Math.min(bw, bh) / 4)
    const blurred = await region.blur(sigma).raw().toBuffer()
    // Máscara: placa completa al 100% y borde suave hasta el margen
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const gx = left + x, gy = top + y
        const dx = Math.max(x0 - gx, 0, gx - x1), dy = Math.max(y0 - gy, 0, gy - y1)
        const a = clamp(1 - Math.hypot(dx, dy) / Math.max(1, m), 0, 1)
        if (a === 0) continue
        const p = (gy * W + gx) * 3, q = (y * bw + x) * 3
        for (let c = 0; c < 3; c++) img.data[p + c] = blurred[q + c] * a + img.data[p + c] * (1 - a)
      }
    }
  }
}
