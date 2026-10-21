'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Button from '@/components/ui/Button'
import { withListingFooter } from '@/lib/listing-footer'

// Copia la descripción (con el pie de EasyMotores) para pegarla en Marketplace u otras redes.
export default function CopyDescriptionButton({ description }: { description: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleCopy = async () => {
    const text = withListingFooter(description)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Navegadores sin Clipboard API (o contexto no seguro)
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      el.remove()
      if (!ok) {
        setFailed(true)
        return
      }
    }
    setFailed(false)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!description.trim()}>
      {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? '¡Copiado!' : failed ? 'No se pudo copiar' : 'Copiar descripción'}
    </Button>
  )
}
