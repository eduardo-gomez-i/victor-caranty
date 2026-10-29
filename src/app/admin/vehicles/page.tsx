import { requireRole } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import AdminVehicleActions from '@/components/admin/AdminVehicleActions'
import DeleteVehicleButton from '@/components/admin/DeleteVehicleButton'
import Link from 'next/link'
import { EyeOff, Images, Pencil } from 'lucide-react'
import VehicleStatusBadge from '@/components/admin/VehicleStatusBadge'

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
          <Table className="[&_td]:px-3 [&_th]:px-3">
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
                    <Link href={`/vehicles/${vehicle.id}`} className="block min-w-36 font-semibold text-gray-900 hover:text-primary hover:underline">
                      {vehicle.make} {vehicle.model} {vehicle.year}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{vehicle.user.name || 'Sin nombre'}</div>
                    <div className="text-xs text-gray-500">{vehicle.user.email}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold text-gray-900 tabular-nums">
                    ${Number(vehicle.price).toLocaleString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <VehicleStatusBadge status={vehicle.status} />
                    {vehicle._count.images > 0 && (
                      <Link
                        href={`/admin/vehicles/${vehicle.id}/photos`}
                        className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {vehicle._count.images === 1 ? '1 foto oculta' : `${vehicle._count.images} fotos ocultas`} · revisar
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
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {new Date(vehicle.createdAt).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AdminVehicleActions vehicleId={vehicle.id} currentStatus={vehicle.status} hiddenPhotos={vehicle._count.images} />
                      <Link
                        href={`/admin/vehicles/${vehicle.id}/photos`}
                        title="Fotos"
                      aria-label="Fotos"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50"
                      >
                        <Images className="h-4 w-4 text-primary" />
                      </Link>
                      <Link
                        href={`/dashboard/vehicles/${vehicle.id}/edit`}
                        title="Editar"
                      aria-label="Editar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50"
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Link>
                      <DeleteVehicleButton vehicleId={vehicle.id} vehicleName={`${vehicle.make} ${vehicle.model} ${vehicle.year}`} />
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
