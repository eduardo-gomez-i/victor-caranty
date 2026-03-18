const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@demo.local'
  const adminPassword = 'Admin123!'
  const adminHash = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador',
      phone: '+520000000000',
      role: 'ADMIN',
      passwordHash: adminHash,
    },
    create: {
      email: adminEmail,
      name: 'Administrador',
      phone: '+520000000000',
      location: { city: 'CDMX', country: 'MX' },
      role: 'ADMIN',
      passwordHash: adminHash,
    },
  })

  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Vendedor Demo',
      phone: '+521234567890',
      location: { city: 'Demo City', country: 'MX' },
      role: 'SELLER',
      passwordHash: await bcrypt.hash('Seller123!', 10),
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
