'use client'

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import Button from "@/components/ui/Button"

export default function AdminTopbar() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-gray-900 hover:text-green-700">
            Easy Motores
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-800">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-gray-800">
            {session?.user?.name || session?.user?.email}
          </span>
          <Button
            size="sm"
            className="rounded-full px-4 bg-slate-800 hover:bg-slate-700 text-white gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
