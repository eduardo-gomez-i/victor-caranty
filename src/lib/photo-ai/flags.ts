// Problemas de contenido que la IA busca en cada foto (compartido con la interfaz del admin)
export const FLAG_KEYS = ["contact_info", "watermark", "not_car", "inappropriate"] as const
export type PhotoFlag = (typeof FLAG_KEYS)[number]

export const PHOTO_FLAG_LABELS: Record<PhotoFlag, string> = {
  contact_info: "datos de contacto en la foto",
  watermark: "marca de agua o logo de otro sitio",
  not_car: "la foto no es del auto",
  inappropriate: "contenido inapropiado",
}

export function parseFlags(value: unknown): PhotoFlag[] {
  return Array.isArray(value) ? value.filter((v): v is PhotoFlag => (FLAG_KEYS as readonly string[]).includes(v)) : []
}
