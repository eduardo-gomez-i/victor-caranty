import Link from 'next/link'
import { ShieldCheck, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto bg-white text-black pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-black font-bold text-xl mb-6">
              <ShieldCheck className="h-8 w-8 text-green-500" />
              <span className="text-black">Caranty-like</span>
            </Link>
            <p className="text-black text-sm leading-relaxed mb-6">
              La forma más segura y confiable de comprar y vender tu auto seminuevo. 
              Sin riesgos, trato directo y con garantía.
            </p>
            <div className="flex gap-4">
              <a href="#" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-black">Comprar</h3>
            <ul className="space-y-4 text-sm text-black">
              <li><Link href="/" className="hover:text-green-400 transition-colors">Ver inventario</Link></li>
              <li><Link href="/publish#financiamiento" className="hover:text-green-400 transition-colors">Financiamiento</Link></li>
              <li><Link href="/" className="hover:text-green-400 transition-colors">Garantía mecánica</Link></li>
              <li><Link href="/" className="hover:text-green-400 transition-colors">Agendar cita</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-black">Vender</h3>
            <ul className="space-y-4 text-sm text-black">
              <li><Link href="/publish" className="hover:text-green-400 transition-colors">Vende tu auto</Link></li>
              <li><Link href="/" className="hover:text-green-400 transition-colors">Guía de precios</Link></li>
              <li><Link href="/" className="hover:text-green-400 transition-colors">Preguntas frecuentes</Link></li>
              <li><Link href="/" className="hover:text-green-400 transition-colors">Consejos de seguridad</Link></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-black">Contacto</h3>
            <ul className="space-y-4 text-sm text-black">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-500 shrink-0" />
                <span>Av. Reforma 123, Ciudad de México, CDMX 06600</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-green-500 shrink-0" />
                <span>+52 (55) 1234-5678</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-500 shrink-0" />
                <span>contacto@carantylike.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Caranty-like. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition-colors">Términos y condiciones</Link>
            <Link href="/politica-de-privacidad" className="hover:text-white transition-colors">Política de privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

