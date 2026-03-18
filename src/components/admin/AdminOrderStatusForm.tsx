'use client'

import { useState } from "react"
import Select from "@/components/ui/Select"
import Textarea from "@/components/ui/Textarea"
import Button from "@/components/ui/Button"
import { useRouter } from "next/navigation"

type Props = {
  orderId: string
  initialStatus: "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"
  initialAdminNotes?: string | null
}

export default function AdminOrderStatusForm({ orderId, initialStatus, initialAdminNotes }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [notes, setNotes] = useState(initialAdminNotes || "")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes: notes,
        }),
      })
      if (!res.ok) {
        console.error(await res.text())
      }
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as Props["initialStatus"])}>
            <option value="NEW">Nuevo</option>
            <option value="IN_PROGRESS">En proceso</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELED">Cancelado</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Notas internas</label>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas visibles solo para administración"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} isLoading={loading} className="rounded-full">
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

