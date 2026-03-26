import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import DeleteUserButton from '@/components/admin/DeleteUserButton'

export const metadata = {
  title: 'Gestión de Usuarios | Admin',
}

export default async function AdminUsersPage() {
  const currentUser = await requireRole(['ADMIN'])

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-600 mt-1">Gestiona los usuarios de la plataforma</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha de registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-gray-900">{user.name || 'Sin nombre'}</TableCell>
                  <TableCell className="text-gray-700">{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-900' : 'bg-gray-100 text-gray-900'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {new Date(user.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.id !== currentUser.id && (
                      <DeleteUserButton userId={user.id} userName={user.name || user.email || 'este usuario'} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-700">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
