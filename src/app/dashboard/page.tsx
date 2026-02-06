import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import Image from "next/image"
import VehicleActions from "@/components/dashboard/VehicleActions"

async function getMyVehicles(userId: string) {
  return prisma.vehicle.findMany({
    where: { userId },
    include: {
      images: {
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login?redirect=/dashboard")
  }

  const vehicles = await getMyVehicles(session.user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis vehículos publicados</h1>

        {vehicles.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-700">Aún no has publicado ningún vehículo.</p>
            <a
              href="/publish"
              className="inline-flex items-center justify-center mt-4 h-10 px-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
            >
              Publicar vehículo
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => {
              const cover = v.images.find((i) => i.isPrimary) || v.images[0]
              return (
                <div key={v.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="relative aspect-video bg-gray-100">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt={`${v.make} ${v.model}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">Sin imagen</div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-gray-900">
                        {v.make} {v.model} <span className="text-gray-500 font-normal">{v.year}</span>
                      </h2>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          v.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {v.isActive ? "Activo" : "Pausado"}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-green-600">${Number(v.price).toLocaleString()}</p>
                    <VehicleActions id={v.id} isActive={v.isActive} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
