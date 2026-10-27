import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import VehicleCard from '@/components/vehicles/VehicleCard'
import SearchFilters from '@/components/search/SearchFilters'
import Link from 'next/link'
import type { Metadata } from 'next'

const PAGE_SIZE = 12

export const metadata: Metadata = {
  title: 'Buscar autos en Querétaro | EasyMotores',
  description: 'Encuentra autos seminuevos en Querétaro, México. Filtra por marca, modelo, año y precio.',
  alternates: { canonical: '/search' },
  openGraph: {
    url: '/search',
    title: 'Buscar autos en Querétaro | EasyMotores',
    description: 'Filtra y encuentra autos seminuevos en Querétaro, México.',
    siteName: 'EasyMotores',
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary',
    title: 'Buscar autos en Querétaro | EasyMotores',
    description: 'Filtra y encuentra autos seminuevos en Querétaro, México.',
  },
}

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
  const maxMileage = sp?.maxMileage ? Number(sp.maxMileage) : undefined
  const page = Math.max(1, Math.floor(Number(sp?.page)) || 1)
  
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

  if (maxMileage) where.mileage = { lte: maxMileage }

  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      include: { images: { where: { hidden: false }, orderBy: { displayOrder: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  // Conserva los filtros al cambiar de página
  const pageHref = (n: number) => {
    const params = new URLSearchParams(Object.entries(sp ?? {}).filter(([k, v]) => k !== 'page' && v))
    if (n > 1) params.set('page', String(n))
    const qs = params.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar searchDefaultValue={make} />
      <main className="w-full bg-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-8">Resultados de búsqueda</h1>
          
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {/* Sidebar */}
            <aside className="w-full md:w-64 shrink-0">
              {/* En celular los filtros se pliegan para que los autos se vean primero */}
              <details className="md:hidden rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer px-4 py-3 font-medium text-gray-900">Filtros</summary>
                <div className="px-2 pb-2">
                  <SearchFilters />
                </div>
              </details>
              <div className="hidden md:block sticky top-24">
                <SearchFilters />
              </div>
            </aside>
            
            {/* Results */}
            <div className="flex-1">
              {vehicles.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-gray-600">
                    {total} {total === 1 ? 'auto' : 'autos'}
                    {pages > 1 && <> · página {page} de {pages}</>}
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {vehicles.map((vehicle) => (
                      <VehicleCard key={vehicle.id} vehicle={vehicle} />
                    ))}
                  </div>
                  {pages > 1 && (
                    <nav aria-label="Páginas" className="mt-8 flex flex-wrap items-center justify-center gap-2">
                      {page > 1 && (
                        <Link href={pageHref(page - 1)} className="h-11 px-4 inline-flex items-center rounded-full border border-gray-200 text-sm font-medium text-gray-900 hover:bg-gray-50">
                          Anterior
                        </Link>
                      )}
                      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                        <Link
                          key={n}
                          href={pageHref(n)}
                          aria-current={n === page ? 'page' : undefined}
                          className={`h-11 w-11 inline-flex items-center justify-center rounded-full text-sm font-semibold ${
                            n === page ? 'bg-primary text-white' : 'border border-gray-200 text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {n}
                        </Link>
                      ))}
                      {page < pages && (
                        <Link href={pageHref(page + 1)} className="h-11 px-5 inline-flex items-center rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-700">
                          Siguiente
                        </Link>
                      )}
                    </nav>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">No se encontraron vehículos</h3>
                  <p className="mt-2 text-gray-500">Intenta ajustar tus filtros de búsqueda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
