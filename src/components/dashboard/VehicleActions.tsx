'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function VehicleActions({ id, isActive, status }: { id: string; isActive: boolean; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const toggleActive = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/my/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!res.ok) {
        console.error(await res.text())
      }
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  const remove = async () => {
    if (!confirm('¿Seguro que quieres eliminar este vehículo?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/my/vehicles/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        console.error(await res.text())
      }
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  const isPendingOrRejected = status === 'pending' || status === 'rejected';

  return (
    <div className="flex gap-2 pt-2">
      <button
        onClick={toggleActive}
        disabled={loading || isPendingOrRejected}
        className="h-9 px-3 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm disabled:opacity-60"
        title={isPendingOrRejected ? "No se puede pausar/activar un vehículo pendiente o rechazado" : ""}
      >
        {isActive ? 'Pausar' : 'Activar'}
      </button>
      <button
        onClick={remove}
        disabled={loading}
        className="h-9 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
      >
        Eliminar
      </button>
      <a
        href={`/vehicles/${id}`}
        className="h-9 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-sm inline-flex items-center"
      >
        Ver
      </a>
    </div>
  )
}
