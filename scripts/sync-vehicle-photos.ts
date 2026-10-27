// Aplica la revisión de fotos a los anuncios existentes: publica las ediciones seguras que quedaron
// "Por revisar" y oculta las fotos con alertas (p. ej. una foto que no es del auto).
// Uso (una vez tras desplegar): npx tsx --tsconfig tsconfig.json scripts/sync-vehicle-photos.ts
import prisma from '@/lib/prisma'
import { finalizeAutoReview } from '@/lib/listing-review'

async function main() {
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, make: true, model: true } })
  for (const v of vehicles) await finalizeAutoReview(v.id)
  const hidden = await prisma.image.findMany({
    where: { hidden: true },
    select: { url: true, vehicle: { select: { make: true, model: true } } },
  })
  console.log(`${vehicles.length} vehículos revisados, ${hidden.length} fotos ocultas`)
  for (const h of hidden) console.log(`- ${h.vehicle.make} ${h.vehicle.model}: ${h.url}`)
}

main().finally(() => prisma.$disconnect())
