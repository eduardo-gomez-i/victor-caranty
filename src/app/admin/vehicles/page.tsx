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
      }
    }
  })

  // Sort manually to ensure 'pending' is at the top
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

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
                      vehicle.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      vehicle.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status === 'pending' ? 'Pendiente' : 
                       vehicle.status === 'active' ? 'Activo' : 
                       vehicle.status === 'rejected' ? 'Rechazado' : vehicle.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {new Date(vehicle.createdAt).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminVehicleActions vehicleId={vehicle.id} currentStatus={vehicle.status} />
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
