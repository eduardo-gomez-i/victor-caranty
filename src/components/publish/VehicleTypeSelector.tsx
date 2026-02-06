'use client'

import { Car, Truck } from 'lucide-react'

interface VehicleTypeSelectorProps {
  value: string
  onChange: (value: string) => void
}

const types = [
  { id: 'sedan', label: 'Sedán', icon: Car },
  { id: 'coupe', label: 'Coupe', icon: Car },
  { id: 'suv', label: 'SUV', icon: Car },
  { id: 'pickup', label: 'Pickup', icon: Truck },
  { id: 'hatchback', label: 'Hatchback', icon: Car },
  { id: 'convertible', label: 'Convertible', icon: Car },
  { id: 'minitruck', label: 'Mini Truck', icon: Truck },
]

export default function VehicleTypeSelector({ value, onChange }: VehicleTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-center font-semibold text-gray-900">Selecciona un tipo de auto</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {types.map((type) => {
          const Icon = type.icon
          const isSelected = value === type.id
          
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              className={`
                flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200
                ${isSelected 
                  ? 'border-green-600 bg-green-50 text-green-700 ring-1 ring-green-600' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-green-200 hover:bg-gray-50'
                }
              `}
            >
              <Icon className={`w-8 h-8 mb-3 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
