'use client'

import Link from 'next/link'
import { ShieldCheck, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import React, { useEffect, useState } from 'react'

interface NavbarProps {
  transparent?: boolean
  showSearch?: boolean
  searchDefaultValue?: string
}

export default function Navbar({ transparent = false, showSearch = true, searchDefaultValue = '' }: NavbarProps) {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isTransparent = transparent && !scrolled
  const textColor = isTransparent ? 'text-white' : 'text-black'

  return (
    <header className={`${isTransparent ? 'fixed inset-x-0 top-0 z-50 bg-transparent' : 'fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-gray-200'} py-4 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className={`inline-flex items-center gap-2 ${textColor} font-bold text-xl`}>
              <ShieldCheck className="h-6 w-6 text-green-500" />
              <span>Caranty-like</span>
            </Link>
            <nav className={`hidden md:flex items-center gap-6 ${isTransparent ? 'text-white/90' : 'text-black/90'} text-sm`}>
              <Link href="/publish" className={`transition-colors ${isTransparent ? 'hover:text-white' : 'hover:text-green-700'}`}>Vende tu auto</Link>
              <Link href="/" className={`transition-colors ${isTransparent ? 'hover:text-white' : 'hover:text-green-700'}`}>Compra un auto</Link>
              <Link href="/nosotros" className={`transition-colors ${isTransparent ? 'hover:text-white' : 'hover:text-green-700'}`}>Nosotros</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {showSearch && (
                <form method="GET" action="/search" className="hidden md:flex items-center rounded-full px-3 h-10 w-64">
                    <input
                      name="make"
                      defaultValue={searchDefaultValue}
                      placeholder="Busca por marca o modelo"
                      className="h-10 w-full rounded-full border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900"
                    />
                </form>
            )}
            
            {isLoading ? (
              <div className="h-10 w-20 bg-slate-800 animate-pulse rounded-full" />
            ) : session?.user ? (
              <div className="flex items-center gap-4">
                <span className={`${isTransparent ? 'text-white' : 'text-black'} text-sm hidden sm:inline-block`}>
                  Hola, {session.user.name?.split(' ')[0]}
                </span>
                {session.user.role === 'ADMIN' && (
                  <Button
                    size="md"
                    variant="secondary"
                    className="rounded-full whitespace-nowrap px-5"
                    onClick={() => router.push('/admin')}
                  >
                    Admin
                  </Button>
                )}
                <Button
                  size="md"
                  variant="primary"
                  className="rounded-full whitespace-nowrap px-5"
                  onClick={() => router.push('/dashboard')}
                >
                  Mis vehículos
                </Button>
                <Button
                  size="md"
                  className="rounded-full px-5 bg-slate-800 hover:bg-slate-700 text-white gap-2"
                  onClick={() => signOut()}
                >
                  <LogOut size={16} />
                  Salir
                </Button>
              </div>
            ) : (
              <Link href="/login" className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
