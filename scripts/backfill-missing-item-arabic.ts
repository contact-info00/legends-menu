import { PrismaClient } from '@prisma/client'
import { buildItemUpdateData } from '../lib/menu-arabic-translation'

const prisma = new PrismaClient()

function needsArabicBackfill(
  arabicValue: string | null | undefined,
  englishValue: string | null | undefined
): boolean {
  const arabic = (arabicValue ?? '').trim()
  if (!arabic) {
    return Boolean((englishValue ?? '').trim())
  }

  const english = (englishValue ?? '').trim()
  if (!english) {
    return false
  }

  return arabic.toLowerCase() === english.toLowerCase()
}

async function backfillMissingItemArabic() {
  console.log('Backfilling missing item Arabic translations...')

  const items = await prisma.item.findMany({
    select: {
      id: true,
      nameKu: true,
      nameEn: true,
      nameAr: true,
      descriptionKu: true,
      descriptionEn: true,
      descriptionAr: true,
      price: true,
      sortOrder: true,
      isActive: true,
      imageMediaId: true,
      imageR2Key: true,
      imageR2Url: true,
    },
  })

  let updated = 0

  for (const item of items) {
    const needsName = needsArabicBackfill(item.nameAr, item.nameEn)
    const needsDescription = needsArabicBackfill(item.descriptionAr, item.descriptionEn)

    if (!needsName && !needsDescription) {
      continue
    }

    console.log(`Translating item ${item.id}: ${item.nameEn}`)

    const updateData = await buildItemUpdateData({}, item)
    await prisma.item.update({
      where: { id: item.id },
      data: updateData,
    })

    updated += 1
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
