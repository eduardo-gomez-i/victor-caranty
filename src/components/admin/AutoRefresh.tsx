'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Recarga los datos del servidor mientras haya fotos en cola o procesándose.
export default function AutoRefresh({ active, intervalMs = 5000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs, router])
  return null
}
