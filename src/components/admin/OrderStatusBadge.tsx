import { OrderStatus } from "@prisma/client"
import Badge from "@/components/ui/Badge"

const label: Record<OrderStatus, string> = {
  NEW: "Nuevo",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completado",
  CANCELED: "Cancelado",
}

const classNames: Record<OrderStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELED: "bg-red-100 text-red-800",
}

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={classNames[status]}>{label[status]}</Badge>
}

