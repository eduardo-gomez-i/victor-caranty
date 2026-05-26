import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import EditVehicleForm from '@/components/dashboard/EditVehicleForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditVehiclePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?redirect=/dashboard/vehicles/${id}/edit`)
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { images: { orderBy: { displayOrder: 'asc' } } },
  })

  if (!vehicle) notFound()

  const isAdmin = session.user.role === 'ADMIN'
  if (vehicle.userId !== session.user.id && !isAdmin) notFound()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="pt-10 pb-12 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Editar vehículo</h1>
            <p className="mt-1 text-gray-600">
              {vehicle.make} {vehicle.model} {vehicle.year}
            </p>
          </div>
          <EditVehicleForm
            vehicle={{
              id: vehicle.id,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              mileage: vehicle.mileage,
              price: Number(vehicle.price),
              description: vehicle.description,
              type: vehicle.type,
              state: vehicle.state,
              location: vehicle.location as { city?: string } | null,
              images: vehicle.images,
            }}
            isAdmin={isAdmin}
          />
        </div>
      </div>
      <Footer />
    </div>
  )
}
