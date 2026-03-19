import Link from 'next/link'
import Image from 'next/image'
import { Prisma } from '@prisma/client'

interface VehicleProps {
  id: string
  make: string
  model: string
  year: number
  price: number | string | Prisma.Decimal
  mileage: number
  location: Prisma.JsonValue | null | undefined
  images: { url: string }[]
}

export default function VehicleCard({ vehicle }: { vehicle: VehicleProps }) {
  return (
    <Link href={`/vehicles/${vehicle.id}`} className="block group">
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition bg-white">
        <div className="aspect-[16/9] bg-gray-100 relative">
          {vehicle.images && vehicle.images[0] ? (
            <Image
              src={vehicle.images[0].url}
              alt={`${vehicle.make} ${vehicle.model}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Sin imagen
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-1 group-hover:text-green-600 line-clamp-1 transition-colors">
            {vehicle.make} {vehicle.model} {vehicle.year}
          </h3>
          <p className="text-xl font-bold text-gray-900 mb-2">
            ${Number(vehicle.price).toLocaleString()}
          </p>
          <div className="flex justify-between text-xs text-gray-600">
            <span>{vehicle.mileage.toLocaleString()} km</span>
            <span>{vehicle.location ? (vehicle.location as { city: string }).city : '-'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
