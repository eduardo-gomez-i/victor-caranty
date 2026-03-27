import prisma from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"

export default async function AdminDashboardPage() {
  const [totalVehicles, activeVehicles, pendingVehicles, totalUsers, recentVehicles] =
    await prisma.$transaction([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { isActive: true, status: "active" } }),
      prisma.vehicle.count({ where: { status: "pending" } }),
      prisma.user.count(),
      prisma.vehicle.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-700">Resumen general de la plataforma</p>
        </div>
        <Link href="/admin/vehicles" className="text-sm font-medium text-primary hover:text-primary-700">
          Ver vehículos
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vehículos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalVehicles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehículos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{activeVehicles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendientes de Aprobación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingVehicles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehículos recientes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-gray-700 text-center py-4">
                        Aún no hay vehículos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentVehicles.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium text-gray-900">
                          {v.make} {v.model} {v.year}
                        </TableCell>
                        <TableCell className="text-gray-700">{v.user.name}</TableCell>
                        <TableCell className="text-gray-700">${Number(v.price).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            v.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            v.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            v.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {v.status === 'pending' ? 'Pendiente' : 
                             v.status === 'active' ? 'Activo' : 
                             v.status === 'rejected' ? 'Rechazado' : v.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
