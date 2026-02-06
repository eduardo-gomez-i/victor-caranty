import { auth } from "@/auth"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function getCurrentUser() {
  const session = await auth()
  return session?.user || null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireRole(roles: Role[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    redirect('/')
  }
  return user
}
