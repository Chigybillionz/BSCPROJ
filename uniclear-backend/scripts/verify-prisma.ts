import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const db = new PrismaClient({ adapter })

  try {
    const user = await db.user.findFirst()
    const university = await db.university.findFirst()
    const stageCount = await db.clearanceStage.count()

    console.log('✅ Connected to Prisma Postgres')
    console.log(`   User           : ${user?.email}`)
    console.log(`   University     : ${university?.name}`)
    console.log(`   Stages seeded  : ${stageCount}`)
  } catch (err) {
    console.error('❌ Connection failed:', err)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
