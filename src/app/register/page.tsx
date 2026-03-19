'use server'
import { Suspense } from 'react'
import RegisterForm from '@/components/auth/RegisterForm'

export default async function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
