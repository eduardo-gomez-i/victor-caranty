'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Credenciales inválidas')
      setLoading(false)
    } else {
      const redirectTo = sp.get('redirect') || '/publish'
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h1 className="ui-title text-2xl">Iniciar sesión</h1>
        <p className="ui-subtitle text-sm mt-1">Accede para publicar tu auto</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
          )}
          <Button type="submit" disabled={loading} isLoading={loading} fullWidth>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  )
}
