import { twMerge } from 'tailwind-merge'

// Estados de un vehículo con color y punto, para que se distingan de un vistazo
const STATUS: Record<string, { label: string; className: string; dot: string }> = {
  active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500' },
  reviewing: { label: 'Procesando fotos', className: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500 animate-pulse' },
  rejected: { label: 'Rechazado', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
  paused: { label: 'Pausado', className: 'bg-gray-100 text-gray-700 ring-gray-500/20', dot: 'bg-gray-400' },
  sold: { label: 'Vendido', className: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
}

export default function VehicleStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, className: 'bg-gray-100 text-gray-700 ring-gray-500/20', dot: 'bg-gray-400' }
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        s.className,
        className
      )}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  )
}
