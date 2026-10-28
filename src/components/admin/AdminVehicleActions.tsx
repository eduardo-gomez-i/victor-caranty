'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, X } from 'lucide-react'

export default function AdminVehicleActions({
  vehicleId,
  currentStatus,
  hiddenPhotos = 0,
}: {
  vehicleId: string
  currentStatus: string
  hiddenPhotos?: number
}) {
  const [loading, setLoading] = useState<'active' | 'rejected' | null>(null)
  const router = useRouter()

  const updateStatus = async (newStatus: 'active' | 'rejected') => {
    const message =
      newStatus === 'active'
        ? `¿Aprobar y publicar este vehículo?${hiddenPhotos > 0 ? `\n\nTambién se publicarán ${hiddenPhotos} foto(s) que estaban ocultas.` : ''}`
        : '¿Rechazar este vehículo? No será visible para el público.'
    if (!window.confirm(message)) return

    setLoading(newStatus)
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Error al actualizar el estado')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  // Solo hay decisión pendiente en "pending" y "reviewing" (se puede adelantar a la revisión automática)
  if (currentStatus !== 'pending' && currentStatus !== 'reviewing') return null

  return (
    <>
      <button
        type="button"
        onClick={() => updateStatus('active')}
        disabled={loading !== null}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading === 'active' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Aprobar
      </button>
      <button
        type="button"
        onClick={() => updateStatus('rejected')}
        disabled={loading !== null}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {loading === 'rejected' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Rechazar
      </button>
    </>
  )
}
