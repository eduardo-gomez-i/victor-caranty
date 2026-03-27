'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FaWhatsapp } from 'react-icons/fa'

export default function ContactSellerForm({
  vehicleId,
  make,
  model,
  year,
}: {
  vehicleId: string
  make: string
  model: string
  year: number
}) {
  const [buyerName, setBuyerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buyerName) return
    setLoading(true)
    try {
      const number = '524428630968'
      const vehicleUrl = typeof window !== 'undefined' ? `${window.location.origin}/vehicles/${vehicleId}` : `Vehículo: ${vehicleId}`
      const text = `Hola, me gustaría pedir informes del ${make} ${model} ${year}.\nNombre: ${buyerName}\nLink: ${vehicleUrl}`

      const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
        Hemos enviado tu solicitud. Pronto se comunicarán contigo.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input placeholder="Nombre" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
      <Button type="submit" isLoading={loading} className="w-full rounded-full">
        <FaWhatsapp className="mr-2 h-5 w-5 shrink-0" />
        Contactar Vendedor
      </Button>
    </form>
  )
}
