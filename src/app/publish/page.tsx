'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import VehicleTypeSelector from '@/components/publish/VehicleTypeSelector'
import { VEHICLE_BRANDS } from '@/constants/vehicles'

const MEXICO_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
] as const

export default function PublishPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    make: '',
    customMake: '',
    model: '',
    year: '',
    mileage: '',
    price: '',
    description: '',
    state: '',
    city: '',
    type: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'make' && value !== '__other__') {
        next.customMake = ''
      }
      return next
    })
  }

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || (files as FileList).length === 0) return
    setUploading(true)
    setError(null)
    const list = Array.isArray(files) ? files : Array.from(files)
    const newImages: string[] = []
    try {
      for (const file of list) {
        const data = new FormData()
        data.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: data })
        if (!res.ok) throw new Error('Error al subir imagen')
        const json = await res.json()
        newImages.push(json.url)
      }
      setImages(prev => [...prev, ...newImages])
    } catch (err) {
      setError('Error subiendo imágenes. Intenta de nuevo.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const make = formData.make === '__other__' ? formData.customMake.trim() : formData.make
      if (!make) {
        throw new Error('Ingresa la marca')
      }
      if (!formData.state) {
        throw new Error('Selecciona el estado')
      }

      const payload = {
        make,
        model: formData.model,
        year: parseInt(formData.year),
        mileage: parseInt(formData.mileage),
        price: parseFloat(formData.price),
        description: formData.description,
        type: formData.type,
        state: formData.state,
        location: { city: formData.city },
        images: images
      }

      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 401) {
          throw new Error('Debes iniciar sesión para publicar')
        }
        throw new Error(data.error || 'Error al publicar vehículo')
      }

      const vehicle = await res.json()
      router.push(`/vehicles/${vehicle.id}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">Publicar vehículo</h1>
            <p className="mt-2 text-gray-600">Completa los datos para crear tu anuncio.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="p-8 space-y-8">
              
              <VehicleTypeSelector
                value={formData.type}
                onChange={(type) => setFormData(prev => ({ ...prev, type }))}
              />

              {/* Vehicle Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Detalles del vehículo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="make" className="block text-sm font-medium text-gray-700">Marca</label>
                    <Select name="make" id="make" required value={formData.make} onChange={handleChange}>
                      <option value="">Selecciona marca</option>
                      {VEHICLE_BRANDS.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                      <option value="__other__">Otra</option>
                    </Select>
                  </div>
                  {formData.make === '__other__' && (
                    <div>
                      <label htmlFor="customMake" className="block text-sm font-medium text-gray-700">Marca (otra)</label>
                      <Input
                        type="text"
                        name="customMake"
                        id="customMake"
                        required
                        value={formData.customMake}
                        onChange={handleChange}
                      />
                    </div>
                  )}
                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700">Modelo</label>
                    <Input type="text" name="model" id="model" required value={formData.model} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">Año</label>
                    <Input type="number" name="year" id="year" required min={1900} max={new Date().getFullYear() + 1} value={formData.year} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">Kilometraje (km)</label>
                    <Input type="number" name="mileage" id="mileage" required min={0} value={formData.mileage} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">Precio ($)</label>
                    <Input type="number" name="price" id="price" required min={0} step="0.01" value={formData.price} onChange={handleChange} />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                    <Textarea name="description" id="description" rows={4} value={formData.description} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">Estado</label>
                    <Select name="state" id="state" required value={formData.state} onChange={handleChange}>
                      <option value="">Selecciona estado</option>
                      {MEXICO_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ciudad</label>
                    <Input type="text" name="city" id="city" value={formData.city} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Fotos</h3>
                <div
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (uploading) return
                    handleFiles(e.dataTransfer.files)
                  }}
                  onClick={() => {
                    if (uploading) return
                    fileInputRef.current?.click()
                  }}
                >
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <span className="relative bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">Subir archivos</span>
                      <p className="pl-1">o arrastra y suelta</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFiles(e.target.files!)}
                    disabled={uploading}
                  />
                </div>

                {/* Image Preview */}
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((url, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden group border border-gray-200">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gray-500 text-white text-xs py-1 text-center">
                            Foto principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button type="submit" disabled={isSubmitting || uploading} isLoading={isSubmitting} fullWidth>
                  Publicar vehículo
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}


