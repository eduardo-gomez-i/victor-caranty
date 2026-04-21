export const revalidate = 0

import Link from 'next/link'
import prisma from '@/lib/prisma'
import { ShieldCheck, Handshake, BadgeDollarSign, Building2, Car, Truck, CarFront, Eye, CalendarCheck, ArrowRight } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import VehicleCard from '@/components/vehicles/VehicleCard'
import { VEHICLE_BRANDS } from '@/constants/vehicles'

export default async function Home() {
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true, status: 'active' },
    include: { images: { where: { isPrimary: true }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  })

  return (
    <div className="space-y-0 min-h-screen flex flex-col">
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('/img/hero.jpg')` }}
        />
        <div className="absolute inset-0 -z-10 bg-black/40" />
        <Navbar transparent showSearch={true} />
        <section className="relative overflow-hidden min-h-[75vh]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 min-h-[75vh] flex items-center justify-center">
          <div className="max-w-4xl w-full text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Compra y Vende aquí tu auto seminuevo
            </h1>
            <p className="mt-2 text-lg text-white/90">Trato directo con 0% riesgo</p>
            <form action="/search" method="GET" className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3 bg-white rounded-3xl md:rounded-full p-3 shadow-lg control-light">
              <select name="make" className="h-14 rounded-full border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900">
                <option value="">Marca</option>
                {VEHICLE_BRANDS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select name="year" className="h-14 rounded-full border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900">
                <option value="">Año</option>
                {Array.from({ length: 20 }).map((_, i) => {
                  const y = new Date().getFullYear() - i
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
              <input name="maxMileage" type="number" min="0" placeholder="Kilometraje máximo" className="h-14 rounded-full border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900" />
              <select name="maxPrice" className="h-14 rounded-full border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900">
                <option value="">Presupuesto</option>
                {[100000,150000,200000,300000,400000,500000].map((p) => (
                  <option key={p} value={p}>Hasta ${p.toLocaleString()}</option>
                ))}
              </select>
              <button type="submit" className="h-14 bg-primary hover:bg-primary-700 text-white font-semibold rounded-full transition-colors px-6">
                Busca un auto
              </button>
            </form>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span>Garantía legal</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Handshake className="h-6 w-6 text-primary" />
                <span>Pago seguro</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <BadgeDollarSign className="h-6 w-6 text-primary" />
                <span>Negocia sin riesgo</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Building2 className="h-6 w-6 text-primary" />
                <span>Entrega en showroom</span>
              </div>
            </div>
          </div>
        </div>
        </section>
      <section className="relative bg-white rounded-t-4xl">
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
                  className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:shadow-md bg-gray-50 hover:bg-white hover:text-primary"
                >
                  <Icon className="h-8 w-8" />
                  <span>{t.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-end justify-between mb-7">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Ofertas destacadas</h2>
            <Link href="/search" className="text-primary hover:text-primary-700 font-medium">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
            {vehicles.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-700">
                No hay vehículos publicados aún.
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-primary to-primary-700 text-white overflow-hidden shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-10 items-center">
              <div>
                <p className="text-white/80 font-semibold">¿Tienes un auto en venta?</p>
                <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
                  Publícalo y llega a compradores reales
                </h2>
                <p className="mt-3 text-white/90">
                  Publica tu auto en minutos con fotos, precio y detalles. Nosotros nos encargamos de atender a los interesados y darte seguimiento hasta concretar la venta.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/publish"
                    className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-white text-primary font-semibold hover:bg-white/90 transition-colors"
                  >
                    Publicar mi vehículo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    href="/nosotros"
                    className="inline-flex items-center justify-center h-12 px-6 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
                  >
                    Conocer más
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-5">
                  <ShieldCheck className="h-7 w-7 text-white" />
                  <p className="mt-3 font-semibold">Publicación confiable</p>
                  <p className="mt-1 text-sm text-white/80">Anuncios claros y sin complicaciones.</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/15 p-5">
                  <BadgeDollarSign className="h-7 w-7 text-white" />
                  <p className="mt-3 font-semibold">Mejor precio</p>
                  <p className="mt-1 text-sm text-white/80">Define tu precio y recibe interesados.</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/15 p-5">
                  <Handshake className="h-7 w-7 text-white" />
                  <p className="mt-3 font-semibold">Cierre más fácil</p>
                  <p className="mt-1 text-sm text-white/80">Nosotros atendemos el WhatsApp y filtramos interesados.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900">Cómo funciona</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="group bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-md hover:shadow-xl transition-transform hover:-translate-y-0.5">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-700 text-white flex items-center justify-center shadow-sm">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-medium text-primary">1. Selecciona tu auto</p>
              <p className="mt-1 font-semibold text-gray-900">Contacta a tu asesor</p>
              <p className="mt-2 text-sm text-gray-600">Elige tu auto ideal y recibe atención personalizada.</p>
            </div>
            <div className="group bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-md hover:shadow-xl transition-transform hover:-translate-y-0.5">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-700 text-white flex items-center justify-center shadow-sm">
                <Eye className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-medium text-primary">2. Agenda tu cita</p>
              <p className="mt-1 font-semibold text-gray-900">Ven a ver el auto</p>
              <p className="mt-2 text-sm text-gray-600">Coordina una cita para conocerlo a detalle.</p>
            </div>
            <div className="group bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-md hover:shadow-xl transition-transform hover:-translate-y-0.5">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-700 text-white flex items-center justify-center shadow-sm">
                <BadgeDollarSign className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-medium text-primary">3. Paga tu auto</p>
              <p className="mt-1 font-semibold text-gray-900">Pagos protegidos</p>
              <p className="mt-2 text-sm text-gray-600">Pago protegido sin fraudes ni riesgos.</p>
            </div>
            <div className="group bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-md hover:shadow-xl transition-transform hover:-translate-y-0.5">
              <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-700 text-white flex items-center justify-center shadow-sm">
                <Car className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-medium text-primary">4. Llévatelo</p>
              <p className="mt-1 font-semibold text-gray-900">Con revisión</p>
              <p className="mt-2 text-sm text-gray-600">Llévatelo con revisión e inspección final.</p>
            </div>
          </div>
        </div>
      </section>
        <div className="bg-white">
          <Footer />
        </div>
      </div>
    </div>
  )
}
