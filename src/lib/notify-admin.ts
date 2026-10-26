import prisma from '@/lib/prisma'

// Aviso por correo (Mailgun) de un vehículo que necesita revisión del admin.
export async function notifyAdminsAboutPendingVehicle(args: {
  origin?: string
  // Por qué la publicación automática se detuvo (vacío = revisión normal)
  reasons?: string[]
  vehicle: {
    id: string
    make: string
    model: string
    year: number
    mileage: number
    price: unknown
    state: string | null
    status: string
    userId: string
  }
}) {
  const debugEnabled = process.env.MAILGUN_DEBUG === '1' || process.env.MAILGUN_DEBUG === 'true'
  const mask = (v: string) => (v.length <= 8 ? '***' : `${v.slice(0, 4)}...${v.slice(-4)}`)

  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  if (!apiKey || !domain) {
    if (debugEnabled) {
      console.log('Mailgun config missing', {
        hasApiKey: Boolean(apiKey),
        hasDomain: Boolean(domain),
        domain,
      })
    }
    return
  }

  const fixed = 'vic.tor56@hotmail.com'
  const to = fixed
  if (!to) return

  const seller = await prisma.user.findUnique({
    where: { id: args.vehicle.userId },
    select: { name: true, email: true, phone: true },
  })

  const from = process.env.MAILGUN_FROM || `postmaster@${domain}`
  const envBaseUrl = process.env.MAILGUN_BASE_URL
  const baseUrl = (envBaseUrl || 'https://api.mailgun.net').replace(/\/+$/, '')
  const subject = `Nuevo vehículo pendiente: ${args.vehicle.make} ${args.vehicle.model} ${args.vehicle.year}`
  const origin = (args.origin || process.env.APP_URL || 'https://easymotores.com').replace(/\/+$/, '')
  const adminUrl = `${origin}/admin/vehicles`
  const vehicleUrl = `${origin}/vehicles/${args.vehicle.id}`
  const reasons = args.reasons ?? []

  const body = new URLSearchParams({
    from,
    to,
    subject,
    text: [
      'Se registró un nuevo vehículo y requiere verificación.',
      ...(reasons.length > 0 ? ['', 'Motivos de revisión:', ...reasons.map((r) => `- ${r}`)] : []),
      '',
      `Vehículo: ${args.vehicle.make} ${args.vehicle.model} ${args.vehicle.year}`,
      `Precio: ${String(args.vehicle.price)}`,
      `Kilometraje: ${args.vehicle.mileage}`,
      `Estado: ${args.vehicle.state ?? '-'}`,
      '',
      `Vendedor: ${seller?.name ?? '-'} (${seller?.email ?? '-'}) ${seller?.phone ?? ''}`.trim(),
      '',
      `Panel admin: ${adminUrl}`,
      `Detalle: ${vehicleUrl}`,
    ].join('\n'),
    html: [
      '<p>Se registró un nuevo vehículo y requiere verificación.</p>',
      reasons.length > 0 ? `<p><b>Motivos de revisión:</b></p><ul>${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : '',
      `<ul>`,
      `<li><b>Vehículo:</b> ${args.vehicle.make} ${args.vehicle.model} ${args.vehicle.year}</li>`,
      `<li><b>Precio:</b> ${String(args.vehicle.price)}</li>`,
      `<li><b>Kilometraje:</b> ${args.vehicle.mileage}</li>`,
      `<li><b>Estado:</b> ${args.vehicle.state ?? '-'}</li>`,
      `</ul>`,
      `<p><b>Vendedor:</b> ${seller?.name ?? '-'} (${seller?.email ?? '-'}) ${seller?.phone ?? ''}</p>`,
      `<p><a href="${adminUrl}">Abrir panel admin</a></p>`,
      `<p><a href="${vehicleUrl}">Abrir detalle del vehículo</a></p>`,
    ].join(''),
  })

  const url = `${baseUrl}/v3/${domain}/messages`
  const authorization = `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`

  if (debugEnabled) {
    console.log('Mailgun request', {
      url,
      domain,
      from,
      to,
      apiKeyMasked: mask(apiKey),
      apiKeyLen: apiKey.length,
      origin,
      vehicleId: args.vehicle.id,
    })
  }

  const send = async (targetBaseUrl: string) => {
    const targetUrl = `${targetBaseUrl.replace(/\/+$/, '')}/v3/${domain}/messages`
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
    return { res, targetUrl }
  }

  let { res, targetUrl } = await send(baseUrl)
  if (res.status === 401 && !envBaseUrl) {
    const fallbackBaseUrl = 'https://api.eu.mailgun.net'
    if (debugEnabled) {
      console.log('Mailgun 401, retrying with EU endpoint', { fallbackBaseUrl })
    }
    ;({ res, targetUrl } = await send(fallbackBaseUrl))
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    console.error('Mailgun error:', res.status, msg)
    if (debugEnabled) {
      console.log('Mailgun response headers', {
        targetUrl,
        wwwAuthenticate: res.headers.get('www-authenticate'),
        requestId: res.headers.get('x-request-id'),
      })
    }
  } else if (debugEnabled) {
    const okMsg = await res.text().catch(() => '')
    console.log('Mailgun ok:', res.status, okMsg)
  }
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
