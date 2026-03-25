import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ContactSellerForm from '@/components/vehicles/ContactSellerForm'
import VehicleImageGallery from '@/components/vehicles/VehicleImageGallery'

interface Props {
  params: Promise<{ id: string }>
}

async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { images: true, user: { select: { name: true, phone: true } } }
  })
  if (!vehicle) notFound()
  return vehicle
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const vehicle = await getVehicle(id)
  
  return {
    title: `${vehicle.make} ${vehicle.model} ${vehicle.year} - $${vehicle.price}`,
    description: `Vendo ${vehicle.make} ${vehicle.model} ${vehicle.year} con ${vehicle.mileage}km. ${vehicle.description?.substring(0, 100)}...`,
    openGraph: {
      images: vehicle.images.map(img => img.url)
    }
  }
}

export default async function VehicleDetail({ params }: Props) {
  const { id } = await params
  const vehicle = await getVehicle(id)

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <VehicleImageGallery images={vehicle.images} alt={`${vehicle.make} ${vehicle.model}`} />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">
              {vehicle.make} {vehicle.model} <span className="text-gray-500 font-normal text-2xl ml-2">{vehicle.year}</span>
            </h1>
            <p className="text-4xl font-bold text-green-600 mb-6">
              ${Number(vehicle.price).toLocaleString()}
            </p>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 py-6 border-y border-gray-100">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Kilometraje</p>
                <p className="font-semibold text-gray-900">{vehicle.mileage.toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Ubicación</p>
                <p className="font-semibold text-gray-900">{vehicle.location ? (vehicle.location as { city: string })?.city : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Vendedor</p>
                <p className="font-semibold text-gray-900">{vehicle.user.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Contacto</p>
                <p className="font-semibold text-gray-900">{vehicle.user.phone || 'No disponible'}</p>
              </div>
            </div>
            
            <div className="prose max-w-none mb-8">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Descripción</h3>
              <p className="whitespace-pre-line text-gray-600 text-sm leading-relaxed">{vehicle.description}</p>
            </div>
            
            <div className="mt-2">
               <div className="space-y-2">
                 <h3 className="text-lg font-semibold text-gray-900">Contactar Vendedor</h3>
                 <ContactSellerForm vehicleId={vehicle.id} />
               </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
