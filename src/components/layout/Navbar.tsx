'use client'

import Link from 'next/link'
import { ShieldCheck, User as UserIcon, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

interface NavbarProps {
  transparent?: boolean
  showSearch?: boolean
  searchDefaultValue?: string
}

export default function Navbar({ transparent = false, showSearch = true, searchDefaultValue = '' }: NavbarProps) {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const router = useRouter()

  return (
    <header className={`${transparent ? 'absolute inset-x-0 top-0 z-50' : 'bg-slate-900'} py-6 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl">
              <ShieldCheck className="h-6 w-6 text-green-500" />
              <span>Caranty-like</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-white/90 text-sm">
              <Link href="/publish" className="hover:text-white transition-colors">Vende tu auto</Link>
              <Link href="/" className="hover:text-white transition-colors">Compra un auto</Link>
              <Link href="/" className="hover:text-white transition-colors">Nosotros</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {showSearch && (
                <form method="GET" action="/search" className="hidden md:flex items-center bg-white rounded-full px-3 h-10 w-72">
                    <input
                      name="make"
                      defaultValue={searchDefaultValue}
                      placeholder="Busca por marca o modelo"
                      className="flex-1 outline-none text-sm text-gray-900"
                    />
                </form>
            )}
            
            {isLoading ? (
              <div className="h-10 w-20 bg-slate-800 animate-pulse rounded-full" />
            ) : session?.user ? (
              <div className="flex items-center gap-4">
                <span className="text-white text-sm hidden sm:inline-block">
                  Hola, {session.user.name?.split(' ')[0]}
                </span>
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
