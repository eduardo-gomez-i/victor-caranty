'use client'

import { useSearchParams } from 'next/navigation'
import { Car, Truck, CarFront } from 'lucide-react'
import { VEHICLE_BRANDS } from '@/constants/vehicles'

export default function SearchFilters() {
  const searchParams = useSearchParams()
  
  const make = searchParams.get('make') || ''
  const model = searchParams.get('model') || ''
  const type = searchParams.get('type') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const minYear = searchParams.get('minYear') || ''
  const maxYear = searchParams.get('maxYear') || ''

  return (
    <form action="/search" method="GET" className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Filtros</h3>
        
        {/* Brand */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium text-gray-700">Marca</label>
          <select 
            name="make" 
            defaultValue={make}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white"
          >
            <option value="">Todas</option>
            {VEHICLE_BRANDS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Modelo</label>
          <input 
            name="model" 
            defaultValue={model}
            placeholder="Ej: Corolla" 
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Tipo de Vehículo</label>
        <select 
          name="type" 
          defaultValue={type}
          className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white"
        >
          <option value="">Todos</option>
          <option value="sedan">Sedán</option>
          <option value="coupe">Coupe</option>
          <option value="suv">SUV</option>
          <option value="pickup">Pickup</option>
          <option value="hatchback">Hatchback</option>
          <option value="convertible">Convertible</option>
          <option value="minitruck">Mini Truck</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Precio</label>
        <div className="grid grid-cols-2 gap-2">
          <input 
            name="minPrice" 
            type="number"
            defaultValue={minPrice}
            placeholder="Mín" 
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
          <input 
            name="maxPrice" 
            type="number"
            defaultValue={maxPrice}
            placeholder="Máx" 
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Year Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Año</label>
        <div className="grid grid-cols-2 gap-2">
          <input 
            name="minYear" 
            type="number"
            defaultValue={minYear}
            placeholder="Desde" 
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
          <input 
            name="maxYear" 
            type="number"
            defaultValue={maxYear}
            placeholder="Hasta" 
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-sm"
          />
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
      >
        Aplicar Filtros
      </button>

      {(make || type || minPrice || maxPrice || minYear || maxYear) && (
        <a 
          href="/search" 
          className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-2"
        >
          Limpiar filtros
        </a>
      )}
    </form>
  )
}
