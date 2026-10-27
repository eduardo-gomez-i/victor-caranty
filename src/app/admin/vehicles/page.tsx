import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import AdminVehicleActions from '@/components/admin/AdminVehicleActions'
import Link from 'next/link'

export const metadata = {
  title: 'Vehículos Pendientes | Admin',
}

export default async function AdminVehiclesPage() {
  await requireRole(['ADMIN'])

  // Get pending vehicles first, then the rest
  const vehicles = await prisma.vehicle.findMany({
    orderBy: [
      { status: 'asc' }, // 'pending' comes before 'active' alphabetically but let's just order by createdAt
      { createdAt: 'desc' }
    ],
    include: {
      user: {
        select: { name: true, email: true }
      },
      _count: { select: { images: { where: { hidden: true } } } }
    }
  })

  // Primero los que necesitan al admin, luego los que están en revisión automática
  const priority = (status: string) => (status === 'pending' ? 0 : status === 'reviewing' ? 1 : 2)
  const sortedVehicles = [...vehicles].sort((a, b) => priority(a.status) - priority(b.status))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
        <p className="text-gray-600 mt-1">Gestiona y aprueba los vehículos publicados por los usuarios</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <Link href={`/vehicles/${vehicle.id}`} className="font-medium text-blue-600 hover:underline">
                      {vehicle.make} {vehicle.model} {vehicle.year}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{vehicle.user.name || 'Sin nombre'}</div>
                    <div className="text-xs text-gray-500">{vehicle.user.email}</div>
                  </TableCell>
                  <TableCell>${Number(vehicle.price).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      vehicle.status === 'reviewing' ? 'bg-purple-100 text-purple-800' :
                      vehicle.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      vehicle.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status === 'pending' ? 'Pendiente' : 
                       vehicle.status === 'reviewing' ? 'Revisión automática' : 
                       vehicle.status === 'active' ? 'Activo' : 
                       vehicle.status === 'rejected' ? 'Rechazado' : vehicle.status}
                    </span>
                    {vehicle._count.images > 0 && (
                      <Link href={`/admin/vehicles/${vehicle.id}/photos`} className="mt-1 block text-xs text-red-700 hover:underline">
                        {vehicle._count.images} foto(s) oculta(s) por revisar
                      </Link>
                    )}
                    {vehicle.status === 'pending' && Array.isArray(vehicle.moderationFlags) && vehicle.moderationFlags.length > 0 && (
                      <ul className="mt-1 text-xs text-amber-700 list-disc pl-4 max-w-xs">
                        {(vehicle.moderationFlags as string[]).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {new Date(vehicle.createdAt).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/vehicles/${vehicle.id}/photos`} className="text-sm text-blue-600 hover:underline">
                        Fotos
                      </Link>
                      <AdminVehicleActions vehicleId={vehicle.id} currentStatus={vehicle.status} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-700">
                    No hay vehículos registrados
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
