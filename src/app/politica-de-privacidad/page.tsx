import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function PoliticaDePrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-500 flex flex-col">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 md:p-10 space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Política de privacidad</h1>
          <p className="text-gray-700 leading-relaxed">
            En Caranty-like protegemos tus datos personales y los usamos únicamente para operar la plataforma, mejorar tu experiencia y cumplir obligaciones legales.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Podemos recopilar información como nombre, correo, teléfono, ubicación y datos de publicaciones para facilitar la compra y venta de vehículos dentro del servicio.
          </p>
          <p className="text-gray-700 leading-relaxed">
            No vendemos tus datos personales a terceros. Solo compartimos información cuando es necesario para prestar el servicio, por requerimiento legal o con tu autorización.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Si deseas actualizar o eliminar tus datos, puedes contactarnos en <span className="font-medium">contacto@carantylike.com</span>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
