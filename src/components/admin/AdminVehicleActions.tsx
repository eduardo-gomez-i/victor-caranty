'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Check, X } from 'lucide-react'

export default function AdminVehicleActions({ vehicleId, currentStatus }: { vehicleId: string, currentStatus: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const updateStatus = async (newStatus: string) => {
    const action = newStatus === 'active' ? 'aprobar' : 'rechazar'
    if (!window.confirm(`¿Estás seguro de que deseas ${action} este vehículo?`)) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) {
        throw new Error('Error al actualizar el estado')
      }
      
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  if (currentStatus !== 'pending') {
    return (
      <span className="text-sm text-gray-500">
        {currentStatus === 'active' ? 'Aprobado' : currentStatus === 'rejected' ? 'Rechazado' : currentStatus}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => updateStatus('active')}
        isLoading={isLoading}
        className="bg-primary hover:bg-primary-700 text-white p-2 h-8"
        title="Aprobar"
      >
        {!isLoading && <Check className="h-4 w-4" />}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => updateStatus('rejected')}
        isLoading={isLoading}
        className="text-red-600 hover:bg-red-50 hover:text-red-700 p-2 h-8"
        title="Rechazar"
      >
        {!isLoading && <X className="h-4 w-4" />}
      </Button>
    </div>
  )
}
