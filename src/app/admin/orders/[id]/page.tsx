import prisma from "@/lib/prisma"
import OrderStatusBadge from "@/components/admin/OrderStatusBadge"
import AdminOrderStatusForm from "@/components/admin/AdminOrderStatusForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import Link from "next/link"

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      vehicle: {
        select: { id: true, make: true, model: true, year: true, price: true, user: { select: { name: true, email: true, phone: true } } },
      },
    },
  })

  if (!order) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <p className="text-gray-700">Pedido no encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedido</h1>
          <p className="text-sm text-gray-600">Detalle y acciones</p>
        </div>
        <Link href="/admin/orders" className="text-sm font-medium text-green-700 hover:text-green-800">
          Volver a pedidos
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información del pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Comprador</p>
                <p className="font-semibold text-gray-900">{order.buyerName}</p>
                <p className="text-sm text-gray-600">{order.buyerEmail || "-"}</p>
                <p className="text-sm text-gray-600">{order.buyerPhone || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Estado</p>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Mensaje</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{order.message || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-gray-900">
              {order.vehicle.make} {order.vehicle.model} {order.vehicle.year}
            </p>
            <p className="text-gray-700">${Number(order.vehicle.price).toLocaleString()}</p>
            <p className="text-sm text-gray-600">
              Vendedor: {order.vehicle.user.name} {order.vehicle.user.phone ? `· ${order.vehicle.user.phone}` : ""}
            </p>
            <Link
              href={`/vehicles/${order.vehicle.id}`}
              className="inline-flex items-center justify-center mt-2 h-9 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-sm"
            >
              Ver publicación
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actualizar estado</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminOrderStatusForm
            orderId={order.id}
            initialStatus={order.status}
            initialAdminNotes={order.adminNotes}
          />
        </CardContent>
      </Card>
    </div>
  )
}

