import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ShieldCheck, Handshake, BadgeDollarSign, Building2, Car, Truck, CarFront } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import VehicleCard from '@/components/vehicles/VehicleCard'
import { VEHICLE_BRANDS } from '@/constants/vehicles'

export default async function Home() {
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, status: 'active' },
    include: { images: { where: { isPrimary: true }, take: 1 } },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  return (
    <div className="space-y-0">
      <section className="relative overflow-hidden">
        <Navbar transparent showSearch={true} />
        <div className="absolute inset-0 -z-10">
          <div className="h-full w-full bg-[url('/hero-car.jpg')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 flex justify-center">
          <div className="max-w-4xl w-full text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Compra y Vende aquí tu auto seminuevo
            </h1>
            <p className="mt-2 text-lg text-white/90">Trato directo con 0% riesgo</p>
            <form action="/search" method="GET" className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-2 bg-white rounded-full p-2 shadow-lg control-light">
              <select name="make" className="h-12 rounded-full border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900">
                <option value="">Marca</option>
                {VEHICLE_BRANDS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select name="year" className="h-12 rounded-full border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900">
                <option value="">Año</option>
                {Array.from({ length: 20 }).map((_, i) => {
                  const y = new Date().getFullYear() - i
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
              <input name="maxMileage" type="number" min="0" placeholder="Kilometraje máximo" className="h-12 rounded-full border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900" />
              <select name="maxPrice" className="h-12 rounded-full border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900">
                <option value="">Presupuesto</option>
                {[100000,150000,200000,300000,400000,500000].map((p) => (
                  <option key={p} value={p}>Hasta ${p.toLocaleString()}</option>
                ))}
              </select>
              <button type="submit" className="h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full transition-colors">
                Busca un auto
              </button>
            </form>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-6 w-6 text-green-400" />
                <span>Garantía legal</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Handshake className="h-6 w-6 text-green-400" />
                <span>Pago seguro</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <BadgeDollarSign className="h-6 w-6 text-green-400" />
                <span>Negocia sin riesgo</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Building2 className="h-6 w-6 text-green-400" />
                <span>Entrega en showroom</span>
              </div>
            </div>
          </div>
        </div>
        <div className="relative bg-white rounded-t-[2rem]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h3 className="text-center text-gray-900 font-semibold">Selecciona un tipo de auto</h3>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-7 gap-4 text-sm text-gray-700">
              {[
                { id: 'sedan', label: 'Sedán', icon: CarFront },
                { id: 'coupe', label: 'Coupe', icon: Car },
                { id: 'suv', label: 'SUV', icon: CarFront },
                { id: 'pickup', label: 'Pickup', icon: Truck },
                { id: 'hatchback', label: 'Hatchback', icon: CarFront },
                { id: 'convertible', label: 'Convertible', icon: Car },
                { id: 'minitruck', label: 'Mini Truck', icon: Truck },
              ].map((t) => {
                const Icon = t.icon
                return (
                  <Link 
                    key={t.id} 
                    href={`/search?type=${t.id}`}
                    className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:shadow-md bg-gray-50 hover:bg-white hover:text-green-600"
                  >
                    <Icon className="h-8 w-8" />
                    <span>{t.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-7">
          <h2 className="text-2xl md:text-3xl font-bold">Ofertas destacadas</h2>
          <Link href="/" className="text-green-700 hover:text-green-800 font-medium">Ver todos</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No hay vehículos publicados aún.
          </div>
        )}
        </div>
      </section>

      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Cómo funciona</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-xs text-gray-600">1. Apártalo</p>
              <p className="font-semibold mt-1">Reserva sin riesgo</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-xs text-gray-600">2. Conócelo</p>
              <p className="font-semibold mt-1">Showroom seguro</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-xs text-gray-600">3. Págalo</p>
              <p className="font-semibold mt-1">Plataforma confiable</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-xs text-gray-600">4. Llévatelo</p>
              <p className="font-semibold mt-1">Entrega con revisión</p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
