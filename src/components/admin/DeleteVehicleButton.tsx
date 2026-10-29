'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'

interface DeleteVehicleButtonProps {
  vehicleId: string
  vehicleName: string
  // A dónde ir después de eliminar; sin valor, solo se refresca la página actual
  redirectTo?: string
  withLabel?: boolean
}

export default function DeleteVehicleButton({ vehicleId, vehicleName, redirectTo, withLabel = false }: DeleteVehicleButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar ${vehicleName}? Se borran el anuncio y sus fotos. Esta acción no se puede deshacer.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/my/vehicles/${vehicleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al eliminar el vehículo')
      }
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al eliminar el vehículo')
      setIsDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Eliminar vehículo"
      aria-label="Eliminar vehículo"
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-60 ${withLabel ? 'px-3 text-sm font-medium' : 'w-8'}`}
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {withLabel && 'Eliminar vehículo'}
    </button>
  )
}
