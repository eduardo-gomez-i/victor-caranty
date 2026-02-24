import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AboutSection from '@/components/about/AboutSection'

export default function NosotrosPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <AboutSection />
      <Footer />
    </div>
  )
}
