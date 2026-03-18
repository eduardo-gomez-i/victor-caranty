'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function ContactSellerForm({ vehicleId }: { vehicleId: string }) {
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buyerName) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, buyerName, buyerEmail, buyerPhone, message }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        console.error(await res.text())
      }
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
        Hemos enviado tu solicitud. Pronto se comunicarán contigo.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input placeholder="Nombre" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
      <Input placeholder="Email" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
      <Input placeholder="Teléfono" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
      <Textarea placeholder="Mensaje" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
      <Button type="submit" isLoading={loading} className="w-full rounded-full">
        Contactar Vendedor
      </Button>
    </form>
  )
}

