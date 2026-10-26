'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function ProcessPhotosButton({ vehicleId, count }: { vehicleId: string; count: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!window.confirm(`Se procesarán ${count} foto(s) con IA (aprox. $0.07 USD c/u como máximo). ¿Continuar?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/photos`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudieron procesar las fotos')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} isLoading={loading} disabled={loading}>
      {!loading && <Sparkles className="mr-2 h-4 w-4 text-primary" />}
      Procesar {count} foto(s) con IA
    </Button>
  )
}
