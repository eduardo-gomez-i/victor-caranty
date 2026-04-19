const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const newEmail = 'vic.tor56@hotmail.com'
  const newPassword = 'V!ct@r56#Mot0res$2026'
  const newHash = await bcrypt.hash(newPassword, 12)

  // Update existing admin (admin@demo.local) to new email
  const updated = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: {
      email: newEmail,
      passwordHash: newHash,
      name: 'Administrador',
    },
  })

  if (updated.count === 0) {
    // No existing admin found, create one
    await prisma.user.create({
      data: {
        email: newEmail,
        name: 'Administrador',
        phone: '+520000000000',
        location: { city: 'CDMX', country: 'MX' },
        role: 'ADMIN',
        passwordHash: newHash,
      },
    })
    console.log('Admin created:', newEmail)
  } else {
    console.log(`Admin updated (${updated.count} record): ${newEmail}`)
  }
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