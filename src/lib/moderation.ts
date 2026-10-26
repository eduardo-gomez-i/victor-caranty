// Revisión automática del texto de un anuncio. Si encuentra algo, la publicación pasa a revisión del admin.
// Busca datos de contacto que saquen la venta de la plataforma (teléfonos, correos, enlaces, redes) y spam.

const CHECKS: { reason: string; pattern: RegExp }[] = [
  {
    reason: "Número de teléfono",
    // 10 dígitos (o +52 / 044 / 045) con o sin separadores de espacio, guion, punto o paréntesis.
    // No usa la coma para no confundir kilometrajes como "29,000".
    pattern: /(?:\+?\s*52[\s.-]*)?(?:0?4[45][\s.-]*)?\(?\d{2,3}\)?(?:[\s.-]*\d){7,8}(?!\d)/,
  },
  { reason: "Correo electrónico", pattern: /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\)|punto)\s*[a-z]{2,}/i },
  {
    reason: "Enlace a sitio web",
    pattern: /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|mx|net|org|info|site|online|store|shop|link|ly|me)(?:\.[a-z]{2})?\b(?:\/\S*)?/i,
  },
  {
    reason: "Redes sociales o mensajería",
    pattern:
      /\b(?:whats\s?app|whatsapp|whats|wats|wpp|wa\.me|watsap|guasap|telegram|t\.me|facebook|fb\.com|face|instagram|insta|ig|tiktok|tik tok|messenger|inbox|dm|signal|snapchat|twitter)\b/i,
  },
  { reason: "Usuario de redes (@)", pattern: /(?:^|\s)@[a-z0-9_.]{3,}/i },
  {
    reason: "Invitación a contactar fuera de la plataforma",
    pattern:
      /\b(?:ll[aá]m(?:a|e|ame|enos)|m[aá]rcame|escr[ií]be(?:me|nos)?|m[aá]nd(?:a|ame)\s+(?:mensaje|msj|whats)|cel(?:ular)?|tel(?:[eé]fono)?|contacto|informes)\b[^.\n]{0,25}\d{3}/i,
  },
  // Números escritos con palabras para esquivar el filtro ("cuatro cuatro dos uno…")
  {
    reason: "Número de teléfono escrito con letras",
    pattern: /\b(?:(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)[\s,.-]+){6,}/i,
  },
]

const SPAM: { reason: string; test: (text: string) => boolean }[] = [
  { reason: "Caracteres repetidos (spam)", test: (t) => /(.)\1{7,}/.test(t.replace(/[\s\-=_*.·•]/g, "")) },
  {
    reason: "Texto repetido (spam)",
    test: (t) => {
      const words = t.toLowerCase().match(/[a-záéíóúñ]{4,}/g) ?? []
      if (words.length < 20) return false
      const counts = new Map<string, number>()
      for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
      // Una sola palabra que ocupa más del 15% del texto
      return Math.max(...counts.values()) / words.length > 0.15
    },
  },
]

export function checkListingText(fields: (string | null | undefined)[]): string[] {
  const text = fields.filter(Boolean).join("\n")
  if (!text.trim()) return []
  const reasons = new Set<string>()
  for (const { reason, pattern } of CHECKS) if (pattern.test(text)) reasons.add(reason)
  for (const { reason, test } of SPAM) if (test(text)) reasons.add(reason)
  return [...reasons]
}
