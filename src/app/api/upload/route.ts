import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo imágenes permitidas' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const nameSafe = file.name.replace(/[^a-zA-Z0-9._-]/g, '')
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}-${nameSafe || 'image'}.${ext}`
    const filepath = path.join(uploadsDir, filename)
    await fs.writeFile(filepath, buffer)

    const url = `/uploads/${filename}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
