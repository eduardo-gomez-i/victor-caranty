'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Car } from "lucide-react"

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehículos", icon: Car },
  { href: "/admin/users", label: "Usuarios", icon: Users },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href))
}

export default function AdminSidebar() {
  const isActive = useIsActive()
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 border-r border-border bg-white">
      <div className="w-full p-6">
        <div className="text-lg font-bold text-gray-900">Administración</div>
        <nav className="mt-6 space-y-1 text-sm">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-gray-800 hover:bg-gray-50 ${isActive(href) ? "bg-gray-50 font-semibold" : ""}`}
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}

// En celular la barra lateral no cabe: las mismas secciones como pestañas arriba del contenido
export function AdminMobileNav() {
  const isActive = useIsActive()
  return (
    <nav className="md:hidden mb-4 grid grid-cols-3 gap-1 rounded-xl border border-border bg-white p-1 text-sm">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 ${isActive(href) ? "bg-primary text-white font-semibold" : "text-gray-800 hover:bg-gray-50"}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
