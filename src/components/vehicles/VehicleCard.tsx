/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { Prisma } from '@prisma/client'

interface VehicleProps {
  id: string
  make: string
  model: string
  year: number
  price: number | string | Prisma.Decimal
  mileage: number
  location: Prisma.JsonValue | null | undefined
  state?: string | null
  images: { url: string }[]
}

export default function VehicleCard({ vehicle }: { vehicle: VehicleProps }) {
  return (
    <Link href={`/vehicles/${vehicle.id}`} className="block group">
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition bg-white">
        <div className="aspect-[16/9] bg-gray-100 relative">
          {vehicle.images && vehicle.images[0] ? (
            <img
              src={vehicle.images[0].url}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Sin imagen
            </div>
          )}
        </div>
        <div className="p-3 md:p-4">
          <h3 className="text-sm md:text-lg font-semibold mb-1 text-gray-900 group-hover:text-primary line-clamp-2 md:line-clamp-1 transition-colors">
            {vehicle.make} {vehicle.model} {vehicle.year}
          </h3>
          <p className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
            ${Number(vehicle.price).toLocaleString()}
          </p>
          <div className="flex flex-col md:flex-row md:justify-between gap-0.5 text-xs text-gray-600">
            <span>{vehicle.mileage.toLocaleString()} km</span>
            <span className="md:ml-3 line-clamp-1">
              {(() => {
                const city = vehicle.location ? (vehicle.location as { city?: string }).city : undefined
                const parts = [city, vehicle.state ?? undefined].filter(Boolean) as string[]
                return parts.length ? parts.join(', ') : '-'
              })()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
