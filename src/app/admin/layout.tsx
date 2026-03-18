import { requireRole } from "@/lib/auth"
import { Role } from "@prisma/client"
import AdminSidebar from "@/components/admin/AdminSidebar"
import AdminTopbar from "@/components/admin/AdminTopbar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.ADMIN])

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminTopbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <AdminSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
