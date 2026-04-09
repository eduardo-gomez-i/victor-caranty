import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ContactSellerForm from '@/components/vehicles/ContactSellerForm'
import VehicleImageGallery from '@/components/vehicles/VehicleImageGallery'
import { auth } from '@/auth'
import { AlertCircle } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

async function getVehicle(id: string) {
  const session = await auth()
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { images: true, user: { select: { id: true, name: true, phone: true } } }
  })
  
  if (!vehicle) notFound()

  // Protect pending/rejected vehicles from public view
  if (vehicle.status !== 'active' && vehicle.status !== 'sold') {
    const isOwner = session?.user?.id === vehicle.user.id
    const isAdmin = session?.user?.role === 'ADMIN'
    
    if (!isOwner && !isAdmin) {
      notFound() // Or you could redirect to a "not authorized" page
    }
  }

  return vehicle
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const vehicle = await getVehicle(id)
  
  return {
    title: `${vehicle.make} ${vehicle.model} ${vehicle.year} en Querétaro - $${vehicle.price}`,
    description: `Compra ${vehicle.make} ${vehicle.model} ${vehicle.year} con ${vehicle.mileage} km en Querétaro, México. Trato directo y pagos protegidos.`,
    alternates: {
      canonical: `/vehicles/${vehicle.id}`,
    },
    openGraph: {
      url: `/vehicles/${vehicle.id}`,
      title: `${vehicle.make} ${vehicle.model} ${vehicle.year} en Querétaro`,
      description: `Auto ${vehicle.make} ${vehicle.model} ${vehicle.year} con ${vehicle.mileage} km. Consulta fotos, precio y detalles.`,
      siteName: 'EasyMotores',
      locale: 'es_MX',
      images: vehicle.images.map(img => img.url),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${vehicle.make} ${vehicle.model} ${vehicle.year} en Querétaro`,
      description: `Auto ${vehicle.make} ${vehicle.model} ${vehicle.year} con ${vehicle.mileage} km en Querétaro.`,
      images: vehicle.images.length ? [vehicle.images[0].url] : undefined,
    }
  }
}

export default async function VehicleDetail({ params }: Props) {
  const { id } = await params
  const vehicle = await getVehicle(id)

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <div className="container mx-auto px-4 pt-10 pb-8">
        {vehicle.status === 'pending' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-yellow-800 font-medium">Vehículo en revisión</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Este vehículo ha sido enviado para su aprobación. Actualmente solo es visible para ti y para los administradores. Una vez aprobado, será visible para todo el público.
              </p>
            </div>
          </div>
        )}
        {vehicle.status === 'rejected' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-red-800 font-medium">Vehículo rechazado</h3>
              <p className="text-red-700 text-sm mt-1">
                La publicación de este vehículo no ha sido aprobada por los administradores.
              </p>
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <VehicleImageGallery images={vehicle.images} alt={`${vehicle.make} ${vehicle.model}`} />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit min-w-0">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 break-words">
              {vehicle.make} {vehicle.model} <span className="text-gray-500 font-normal text-2xl ml-2">{vehicle.year}</span>
            </h1>
            <p className="text-4xl font-bold text-primary mb-6">
              ${Number(vehicle.price).toLocaleString()}
            </p>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 py-6 border-y border-gray-100">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Kilometraje</p>
                <p className="font-semibold text-gray-900">{vehicle.mileage.toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Ubicación</p>
                <p className="font-semibold text-gray-900 break-words">
                  {(() => {
                    const city = vehicle.location ? (vehicle.location as { city?: string })?.city : undefined
                    const parts = [city, vehicle.state ?? undefined].filter(Boolean) as string[]
                    return parts.length ? parts.join(', ') : 'N/A'
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Contacto</p>
                <p className="font-semibold text-gray-900">
                  <a
                    href="https://wa.me/524428630968"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gray-900 hover:text-primary underline"
                  >
                    +52 442 863 0968
                  </a>
                  </p>
              </div>
            </div>
            
            <div className="prose max-w-none mb-8">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Descripción</h3>
              <p className="whitespace-pre-line break-words text-gray-600 text-sm leading-relaxed">{vehicle.description}</p>
            </div>
            
            <div className="mt-2">
               <div className="space-y-2">
                 <h3 className="text-lg font-semibold text-gray-900">Contactar Vendedor</h3>
                 <ContactSellerForm vehicleId={vehicle.id} make={vehicle.make} model={vehicle.model} year={vehicle.year} />
               </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
