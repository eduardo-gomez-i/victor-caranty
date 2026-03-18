import prisma from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"

export default async function AdminDashboardPage() {
  const [totalOrders, newOrders, inProgressOrders, completedOrders, canceledOrders, activeVehicles, recentOrders] =
    await prisma.$transaction([
      prisma.order.count(),
      prisma.order.count({ where: { status: "NEW" } }),
      prisma.order.count({ where: { status: "IN_PROGRESS" } }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.order.count({ where: { status: "CANCELED" } }),
      prisma.vehicle.count({ where: { isActive: true, status: "active" } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          vehicle: {
            select: { id: true, make: true, model: true, year: true },
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
        <Link href="/admin/orders" className="text-sm font-medium text-green-700 hover:text-green-800">
          Ver pedidos
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pedidos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{newOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>En proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{inProgressOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{completedOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cancelados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{canceledOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Publicaciones activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{activeVehicles}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pedidos recientes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-gray-700">
                        Aún no hay pedidos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium text-gray-900">
                          {o.vehicle.make} {o.vehicle.model} {o.vehicle.year}
                        </TableCell>
                        <TableCell className="text-gray-700">{o.buyerName}</TableCell>
                        <TableCell>
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="text-sm font-medium text-green-700 hover:text-green-800"
                          >
                            Ver
                          </Link>
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
