import prisma from "@/lib/prisma"
import { Prisma, OrderStatus } from "@prisma/client"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import { Card, CardContent } from "@/components/ui/Card"

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  const status = sp.status as OrderStatus | undefined
  const q = sp.q || undefined

  const where: Prisma.OrderWhereInput = {}
  if (status) where.status = status
  if (q) {
    where.OR = [
      { buyerName: { contains: q } },
      { buyerEmail: { contains: q } },
      { buyerPhone: { contains: q } },
      { vehicle: { make: { contains: q } } },
      { vehicle: { model: { contains: q } } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    include: { vehicle: { select: { id: true, make: true, model: true, year: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-700">Gestión de solicitudes de compra</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <form action="/admin/orders" method="GET" className="flex gap-2 w-full md:w-auto">
              <select
                name="status"
                defaultValue={status || ""}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900"
              >
                <option value="">Todos</option>
                <option value="NEW">Nuevo</option>
                <option value="IN_PROGRESS">En proceso</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELED">Cancelado</option>
              </select>
              <input
                name="q"
                defaultValue={q || ""}
                placeholder="Buscar"
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900 w-full md:w-64"
              />
              <button className="h-10 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                Filtrar
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-gray-700">
                      No hay pedidos con esos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-gray-700">
                        {o.createdAt.toLocaleString()}
                      </TableCell>
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
  )
}
