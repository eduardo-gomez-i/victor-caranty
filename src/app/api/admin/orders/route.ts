import { NextRequest, NextResponse } from "next/server"
import { Prisma, OrderStatus } from "@prisma/client"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const status = (sp.get("status") as OrderStatus | null) || undefined
    const q = (sp.get("q") || "").trim() || undefined
    const page = Math.max(1, Number(sp.get("page") || 1))
    const perPage = Math.min(100, Math.max(1, Number(sp.get("perPage") || 20)))
    const skip = (page - 1) * perPage

    const where: Prisma.OrderWhereInput = {}
    if (status) where.status = status
    if (q) {
      where.OR = [
        { buyerName: { contains: q } },
        { buyerEmail: { contains: q } },
        { buyerPhone: { contains: q } },
        { vehicle: { make: { contains: q } } },
        { vehicle: { model: { contains: q } } },
        { vehicle: { user: { name: { contains: q } } } },
      ]
    }

    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              user: { select: { name: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      items,
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    })
  } catch (error) {
    console.error("GET /api/admin/orders error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
