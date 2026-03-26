'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface DeleteUserButtonProps {
  userId: string
  userName: string
}

export default function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar a ${userName}? Esta acción no se puede deshacer.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar usuario')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al eliminar usuario')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      isLoading={isDeleting}
      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-transparent hover:border-red-200"
      title="Eliminar usuario"
    >
      {!isDeleting && <Trash2 className="h-4 w-4" />}
    </Button>
  )
}
