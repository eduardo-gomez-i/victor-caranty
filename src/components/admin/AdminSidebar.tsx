import Link from "next/link"
import { LayoutDashboard, ShoppingCart } from "lucide-react"

export default function AdminSidebar() {
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 border-r border-border bg-white">
      <div className="w-full p-6">
        <div className="text-lg font-bold text-gray-900">Administración</div>
        <nav className="mt-6 space-y-1 text-sm">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-gray-800 hover:bg-gray-50"
          >
            <LayoutDashboard className="h-4 w-4 text-green-600" />
            Dashboard
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-gray-800 hover:bg-gray-50"
          >
            <ShoppingCart className="h-4 w-4 text-green-600" />
            Pedidos
          </Link>
        </nav>
      </div>
    </aside>
  )
}

