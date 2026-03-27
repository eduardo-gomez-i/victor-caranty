import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Twitter, Instagram, Linkedin, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#2f2f2f] text-white rounded-t-[2rem] border-t border-white/10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              <div>
                <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-6">
                  <Image
                    src="/easymotores_logo.png"
                    alt="EasyMotores"
                    width={180}
                    height={32}
                    className="h-8 w-auto rounded bg-white px-2 py-1"
                  />
                </Link>
                <p className="text-white/80 text-sm leading-relaxed mb-6">
                  La forma más segura y confiable de comprar y vender tu auto seminuevo. Sin riesgos, trato directo y con garantía.
                </p>
                <div className="flex gap-3">
                  <a
                    href="#"
                    className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    href="#"
                    className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    href="#"
                    className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a
                    href="#"
                    className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-6 text-white">Comprar</h3>
                <ul className="space-y-4 text-sm text-white/80">
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors">
                      Ver inventario
                    </Link>
                  </li>
                  <li>
                    <Link href="/publish#financiamiento" className="hover:text-primary transition-colors">
                      Financiamiento
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors">
                      Garantía mecánica
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors">
                      Agendar cita
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-6 text-white">Vender</h3>
                <ul className="space-y-4 text-sm text-white/80">
                  <li>
                    <Link href="/publish" className="hover:text-primary transition-colors">
                      Vende tu auto
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors">
                      Guía de precios
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors">
                      Preguntas frecuentes
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="hover:text-primary transition-colors">
                      Consejos de seguridad
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-6 text-white">Contacto</h3>
                <ul className="space-y-4 text-sm text-white/80">
                  <li className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <span>San Juan del Río, Querétaro, México</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary shrink-0" />
                    <a
                      href="https://wa.me/524428630968"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      +52 (442) 863-0968
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/70">
            <p>&copy; {new Date().getFullYear()} Easy Motores. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <Link href="/" className="hover:text-white transition-colors">
                Términos y condiciones
              </Link>
              <Link href="/politica-de-privacidad" className="hover:text-white transition-colors">
                Política de privacidad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
