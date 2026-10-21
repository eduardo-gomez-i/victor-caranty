// Pie fijo de todas las descripciones. Solo texto plano (sin URLs ni teléfono) para que
// Facebook Marketplace no lo trate como enlace externo o contacto fuera de la plataforma.
export const LISTING_FOOTER = [
  'EasyMotores.com',
  '',
  'Conectamos compradores y vendedores de autos entre particulares, brindando seguridad, revisión general del vehículo y seguimiento de la operación hasta el cierre. 🛡️',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '',
  'Síguenos en Facebook e Instagram:',
  '',
  '🔵 Facebook  📸 Instagram',
  '@easymotores',
].join('\n')

export function withListingFooter(description: string) {
  const text = description.trimEnd()
  if (text.includes(LISTING_FOOTER)) return text
  return text ? `${text}\n\n${LISTING_FOOTER}` : LISTING_FOOTER
}
