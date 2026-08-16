import { prisma } from '@/lib/prisma'
import { mapAdvancedOptionsPayload } from '@/lib/advanced-options'

export async function findOwnedItem(
  itemId: string,
  restaurantId: string
): Promise<{ id: string; restaurantId: string; nameEn: string } | null> {
  return prisma.item.findFirst({
    where: { id: itemId, restaurantId },
    select: { id: true, restaurantId: true, nameEn: true },
  })
}

export async function loadAdvancedOptionsForItem(itemId: string, activeOnly = false) {
  const [groups, levels] = await Promise.all([
    prisma.advancedOptionGroup.findMany({
      where: {
        itemId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        options: {
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.itemLevel.findMany({
      where: {
        itemId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  return mapAdvancedOptionsPayload({ groups, levels })
}
