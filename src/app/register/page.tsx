'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          location: { city },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al registrarse')
      }

      // Login automático después del registro
      const loginRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (loginRes?.error) {
         // Si falla el login automático, redirigir al login manual
         router.push('/login')
      } else {
         const redirectTo = sp.get('redirect') || '/publish'
         router.push(redirectTo)
         router.refresh()
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h1 className="ui-title text-2xl">Crear cuenta</h1>
        <p className="ui-subtitle text-sm mt-1">Regístrate para vender autos</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ciudad</label>
            <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}
          <Button type="submit" disabled={loading} isLoading={loading} fullWidth>
            {loading ? 'Registrando...' : 'Registrarse'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}
