import { prisma } from '@/lib/prisma'
import { buildItemUpdateData, AzureTranslatorError } from '@/lib/menu-arabic-translation'

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

export type ItemArabicBackfillResult = {
  id: string
  nameEn: string
  nameAr: string
}

export async function backfillMissingItemArabicForRestaurant(
  restaurantId: string
): Promise<ItemArabicBackfillResult[]> {
  const items = await prisma.item.findMany({
    where: { restaurantId },
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

  const updated: ItemArabicBackfillResult[] = []

  for (const item of items) {
    const needsName = needsArabicBackfill(item.nameAr, item.nameEn)
    const needsDescription = needsArabicBackfill(item.descriptionAr, item.descriptionEn)

    if (!needsName && !needsDescription) {
      continue
    }

    const updateData = await buildItemUpdateData({}, item)
    const saved = await prisma.item.update({
      where: { id: item.id },
      data: updateData,
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
      },
    })

    updated.push(saved)
  }

  return updated
}

export { AzureTranslatorError, needsArabicBackfill }
