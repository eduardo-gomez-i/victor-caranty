'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'
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

  // Mismos campos que exige /api/ai/vehicle-description
  const required = [
    { label: 'Marca', done: !!vehicle.make },
    { label: 'Modelo', done: !!vehicle.model.trim() },
    { label: 'Año', done: !!vehicle.year },
    { label: 'Kilometraje', done: vehicle.mileage !== '' },
    { label: 'Transmisión', done: !!vehicle.transmission },
    { label: 'Tipo de factura', done: !!vehicle.invoiceType },
  ]
  const missing = required.filter((r) => !r.done)
  const ready = missing.length === 0

  const handleClick = async () => {
    if (!ready) return
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
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Genera la descripción con IA</p>
          <p className="text-xs text-gray-600">
            La IA busca el equipamiento de tu versión y arma el texto listo para publicar.
            Primero completa estos datos:
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
        {required.map((r) => (
          <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.done ? 'text-green-700' : 'text-gray-500'}`}>
            {r.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {r.label}
          </li>
        ))}
      </ul>
      {!vehicle.version.trim() && (
        <p className="text-xs text-gray-500">Tip: agrega la versión para un equipamiento más preciso.</p>
      )}

      <Button type="button" onClick={handleClick} isLoading={loading} disabled={!ready || loading} fullWidth>
        {!loading && <Sparkles className="mr-2 h-4 w-4" />}
        {loading
          ? 'Generando descripción...'
          : ready
            ? 'Generar descripción con IA'
            : `Completa ${missing.length} ${missing.length === 1 ? 'dato' : 'datos'} para generar`}
      </Button>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {origin?.source === 'catalog' && (
        <p className="text-xs text-green-700">Ficha verificada por un administrador</p>
      )}
      {origin?.source === 'web' && (
        <p className="text-xs text-gray-500">
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
