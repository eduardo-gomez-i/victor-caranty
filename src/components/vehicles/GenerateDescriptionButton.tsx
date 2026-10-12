'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
  vehicle: {
    make: string
    model: string
    version: string
    year: string
    mileage: string
    transmission: string
    invoiceType: string
    type: string
  }
  currentDescription: string
  onGenerated: (description: string) => void
}

export default function GenerateDescriptionButton({ vehicle, currentDescription, onGenerated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState<{ source: 'catalog' | 'web'; sources: string[] } | null>(null)

  const missing =
    !vehicle.make || !vehicle.model || !vehicle.year || vehicle.mileage === '' ||
    !vehicle.transmission || !vehicle.invoiceType

  const handleClick = async () => {
    if (missing) {
      setError('Completa marca, modelo, año, kilometraje, transmisión y tipo de factura')
      return
    }
    if (currentDescription.trim() && !window.confirm('Esto reemplazará la descripción actual. ¿Continuar?')) {
      return
    }
    setLoading(true)
    setError(null)
    setOrigin(null)
    try {
      const res = await fetch('/api/ai/vehicle-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vehicle,
          year: parseInt(vehicle.year),
          mileage: parseInt(vehicle.mileage),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo generar la descripción')
      onGenerated(data.description)
      setOrigin({ source: data.source, sources: data.sources ?? [] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la descripción')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} isLoading={loading} disabled={loading}>
        {!loading && <Sparkles className="mr-2 h-4 w-4 text-primary" />}
        {loading ? 'Generando...' : 'Generar con IA'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {origin?.source === 'catalog' && (
        <p className="text-xs text-green-700">Ficha verificada por un administrador</p>
      )}
      {origin?.source === 'web' && (
        <p className="text-xs text-gray-500 text-right">
          Revisa los datos. Fuentes:{' '}
          {origin.sources.length === 0
            ? 'no indicadas'
            : origin.sources.map((url, i) => (
                <span key={url}>
                  {i > 0 && ', '}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
                    {hostname(url)}
                  </a>
                </span>
              ))}
        </p>
      )}
    </div>
  )
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
