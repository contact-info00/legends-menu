import { PrismaClient } from '@prisma/client'
import { backfillMissingItemArabicForRestaurant } from '../lib/backfill-item-arabic'

const prisma = new PrismaClient()

async function backfillMissingItemArabic() {
  console.log('Backfilling missing item Arabic translations...')

  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, slug: true, nameEn: true },
  })

  let updated = 0

  for (const restaurant of restaurants) {
    console.log(`Restaurant: ${restaurant.nameEn} (${restaurant.slug})`)
    const results = await backfillMissingItemArabicForRestaurant(restaurant.id)
    for (const item of results) {
      console.log(`  ✓ ${item.nameEn} -> ${item.nameAr}`)
    }
    updated += results.length
  }

  console.log(`Backfill complete. Updated ${updated} item(s).`)
}

backfillMissingItemArabic()
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
