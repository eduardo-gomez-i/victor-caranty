'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import VehicleTypeSelector from '@/components/publish/VehicleTypeSelector'
import PhotoGuide from '@/components/vehicles/PhotoGuide'
import GenerateDescriptionButton from '@/components/vehicles/GenerateDescriptionButton'
import CopyDescriptionButton from '@/components/vehicles/CopyDescriptionButton'
import { PhotoAiBadge, PhotoAiWaitNotice, usePhotoAi } from '@/components/vehicles/usePhotoAi'
import { INVOICE_TYPES, TRANSMISSIONS, VEHICLE_BRANDS } from '@/constants/vehicles'

const MEXICO_STATES = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas',
] as const

interface VehicleData {
  id: string
  make: string
  model: string
  version: string | null
  invoiceType: string | null
  transmission: string | null
  year: number
  mileage: number
  price: number
  description: string | null
  type: string | null
  state: string | null
  location: { city?: string } | null
  images: { id: string; url: string; displayOrder: number; isPrimary: boolean }[]
}

export default function EditVehicleForm({ vehicle, isAdmin }: { vehicle: VehicleData; isAdmin: boolean }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const knownBrand = VEHICLE_BRANDS.includes(vehicle.make as never)
  const [formData, setFormData] = useState({
    make: knownBrand ? vehicle.make : '__other__',
    customMake: knownBrand ? '' : vehicle.make,
    model: vehicle.model,
    version: vehicle.version ?? '',
    invoiceType: vehicle.invoiceType ?? '',
    transmission: vehicle.transmission ?? '',
    year: String(vehicle.year),
    mileage: String(vehicle.mileage),
    price: String(vehicle.price),
    description: vehicle.description ?? '',
    state: vehicle.state ?? '',
    city: vehicle.location?.city ?? '',
    type: vehicle.type ?? '',
  })

  const sortedImages = [...vehicle.images].sort((a, b) => a.displayOrder - b.displayOrder)
  const [images, setImages] = useState<string[]>(sortedImages.map(i => i.url))
  const photoAi = usePhotoAi(images)
  const [skipAiWait, setSkipAiWait] = useState(false)
  const waitingAi = photoAi.processing > 0 && !skipAiWait

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'make' && value !== '__other__') next.customMake = ''
      return next
    })
  }

  const compressImage = (file: File, maxWidth = 1920, quality = 0.82): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || (files as FileList).length === 0) return
    setUploading(true)
    setError(null)
    const list = Array.isArray(files) ? files : Array.from(files)
    const newUrls: string[] = []
    try {
      for (const file of list) {
        const compressed = await compressImage(file)
        const data = new FormData()
        data.append('file', compressed)
        const res = await fetch('/api/upload', { method: 'POST', body: data })
        if (!res.ok) throw new Error('Error al subir imagen')
        const json = await res.json()
        newUrls.push(json.url)
      }
      setImages(prev => [...prev, ...newUrls])
    } catch {
      setError('Error subiendo imágenes. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const make = formData.make === '__other__' ? formData.customMake.trim() : formData.make
      if (!make) throw new Error('Ingresa la marca')
      if (!formData.state) throw new Error('Selecciona el estado')

      const res = await fetch(`/api/my/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make,
          model: formData.model,
          version: formData.version,
          invoiceType: formData.invoiceType,
          transmission: formData.transmission,
          year: parseInt(formData.year),
          mileage: parseInt(formData.mileage),
          price: parseFloat(formData.price),
          description: formData.description,
          type: formData.type,
          state: formData.state,
          location: { city: formData.city },
          images,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg overflow-hidden">
      <div className="p-8 space-y-8">

        <VehicleTypeSelector
          value={formData.type}
          onChange={(type) => setFormData(prev => ({ ...prev, type }))}
        />

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Detalles del vehículo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Marca</label>
              <Select name="make" required value={formData.make} onChange={handleChange}>
                <option value="">Selecciona marca</option>
                {VEHICLE_BRANDS.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
                <option value="__other__">Otra</option>
              </Select>
            </div>
            {formData.make === '__other__' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Marca (otra)</label>
                <Input type="text" name="customMake" required placeholder="Ej. Cupra" value={formData.customMake} onChange={handleChange} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Modelo</label>
              <Input type="text" name="model" required placeholder="Ej. Jetta" value={formData.model} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700">Versión</label>
              <Input type="text" name="version" id="version" placeholder="Ej. Comfortline" value={formData.version} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Año</label>
              <Input type="number" name="year" required placeholder="Ej. 2020" min={1900} max={new Date().getFullYear() + 1} value={formData.year} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Kilometraje (km)</label>
              <Input type="number" name="mileage" required placeholder="Ej. 45000" min={0} value={formData.mileage} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="transmission" className="block text-sm font-medium text-gray-700">Transmisión</label>
              <Select name="transmission" id="transmission" required value={formData.transmission} onChange={handleChange}>
                <option value="">Selecciona transmisión</option>
                {TRANSMISSIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="invoiceType" className="block text-sm font-medium text-gray-700">Tipo de factura</label>
              <Select name="invoiceType" id="invoiceType" required value={formData.invoiceType} onChange={handleChange}>
                <option value="">Selecciona tipo de factura</option>
                {INVOICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {/* Anuncios con un tipo de la lista anterior: se conserva hasta que lo cambien */}
                {vehicle.invoiceType && !(INVOICE_TYPES as readonly string[]).includes(vehicle.invoiceType) && (
                  <option value={vehicle.invoiceType}>{vehicle.invoiceType}</option>
                )}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio ($)</label>
              <Input type="number" name="price" required placeholder="Ej. 285000" min={0} step="0.01" value={formData.price} onChange={handleChange} />
            </div>
            <div className="md:col-span-2 space-y-3">
              <GenerateDescriptionButton
                vehicle={{
                  make: formData.make === '__other__' ? formData.customMake.trim() : formData.make,
                  model: formData.model,
                  version: formData.version,
                  year: formData.year,
                  mileage: formData.mileage,
                  transmission: formData.transmission,
                  invoiceType: formData.invoiceType,
                  type: formData.type,
                }}
                currentDescription={formData.description}
                onGenerated={(description) => setFormData(prev => ({ ...prev, description }))}
              />
              <div>
                <div className="flex items-end justify-between gap-4 mb-1">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                  <CopyDescriptionButton description={formData.description} />
                </div>
                <Textarea
                  name="description"
                  id="description"
                  rows={14}
                  placeholder="Genera la descripción con IA o escríbela aquí. Ej. Único dueño, servicios de agencia, llantas nuevas..."
                  value={formData.description}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Puedes revisar y editar el texto antes de guardar. &quot;Copiar descripción&quot; incluye el pie de EasyMotores para pegarlo en Marketplace u otras redes.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <Select name="state" required value={formData.state} onChange={handleChange}>
                <option value="">Selecciona estado</option>
                {MEXICO_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ciudad</label>
              <Input type="text" name="city" placeholder="Ej. Santiago de Querétaro" value={formData.city} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Fotos</h3>
          <PhotoGuide uploaded={images.length} uploading={uploading} onUpload={() => fileInputRef.current?.click()} />
          <div
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (!uploading) handleFiles(e.dataTransfer.files) }}
            onClick={() => { if (!uploading) fileInputRef.current?.click() }}
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <span className="relative bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">Agregar fotos</span>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG hasta 10MB</p>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files!)}
              disabled={uploading}
            />
          </div>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((url, index) => (
                <div key={url} className="relative aspect-video rounded-lg overflow-hidden group border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoAi.photos[url]?.editedUrl ?? url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                  {photoAi.enabled && <PhotoAiBadge state={photoAi.photos[url]?.state} />}
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

        {!isAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
            Al guardar los cambios revisaremos el anuncio y las fotos. Si todo está en orden se publica automáticamente en unos minutos; si encontramos datos de contacto, enlaces o algo fuera de lugar, lo revisará un administrador.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {waitingAi && <PhotoAiWaitNotice processing={photoAi.processing} total={images.length} onSkip={() => setSkipAiWait(true)} />}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/dashboard')}
            disabled={isSubmitting || uploading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || uploading || waitingAi} isLoading={isSubmitting} fullWidth>
            Guardar cambios
          </Button>
        </div>
      </div>
    </form>
  )
}
