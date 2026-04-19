'use server'
import { Suspense } from 'react'
import Navbar from '@/components/layout/Navbar'
import RegisterForm from '@/components/auth/RegisterForm'

export default async function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar showSearch={false} />
      <div className="flex-1 flex items-center justify-center px-4">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}
