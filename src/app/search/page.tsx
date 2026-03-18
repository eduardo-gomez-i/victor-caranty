import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import VehicleCard from '@/components/vehicles/VehicleCard'
import SearchFilters from '@/components/search/SearchFilters'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  const make = sp?.make || undefined
  const model = sp?.model // string | undefined
  const type = sp?.type || undefined
  const year = sp?.year ? Number(sp.year) : undefined
  const minYear = sp?.minYear ? Number(sp.minYear) : undefined
  const maxYear = sp?.maxYear ? Number(sp.maxYear) : undefined
  const minPrice = sp?.minPrice ? Number(sp.minPrice) : undefined
  const maxPrice = sp?.maxPrice ? Number(sp.maxPrice) : undefined
  
  const where: Prisma.VehicleWhereInput = { isActive: true, status: 'active' }
  
  if (model !== undefined) {
    if (make) where.make = make
    if (model) where.model = { contains: model }
  } else if (make) {
    where.OR = [
      { make: { contains: make } },
      { model: { contains: make } }
    ]
  }
  
  if (type) where.type = type
  
  if (year) {
    where.year = year
  } else if (minYear || maxYear) {
    where.year = {}
    if (minYear) where.year.gte = minYear
    if (maxYear) where.year.lte = maxYear
  }

  // Handle price range properly with Prisma Decimal type or similar logic
  if (minPrice || maxPrice) {
    // For Decimal, we can pass numbers, Prisma handles it.
    // We need to construct the object carefully.
    const priceFilter: Prisma.DecimalFilter = {}
    if (minPrice) priceFilter.gte = minPrice
    if (maxPrice) priceFilter.lte = maxPrice
    where.price = priceFilter
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: { images: { where: { isPrimary: true }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-gray-500 flex flex-col">
      <Navbar searchDefaultValue={make} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Resultados de búsqueda</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="sticky top-24">
              <SearchFilters />
            </div>
          </aside>
          
          {/* Results */}
          <main className="flex-1">
            {vehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">No se encontraron vehículos</h3>
                <p className="mt-2 text-gray-500">Intenta ajustar tus filtros de búsqueda.</p>
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  )
}
