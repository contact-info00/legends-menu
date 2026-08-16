import { isAdvancedSelectionMode } from '@/lib/advanced-options'
import type { MenuItem, MenuItemAdvancedOptions } from '@/lib/menu-types'

/** Nested Prisma select for customer menu — active groups/options/levels only. */
export const PUBLIC_ITEM_ADVANCED_OPTIONS_SELECT = {
  advancedOptionGroups: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      nameKu: true,
      nameEn: true,
      nameAr: true,
      selectionMode: true,
      sortOrder: true,
      options: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          nameKu: true,
          nameEn: true,
          nameAr: true,
          priceAdjustment: true,
          sortOrder: true,
        },
      },
    },
  },
  itemLevels: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      nameKu: true,
      nameEn: true,
      nameAr: true,
      value: true,
      sortOrder: true,
    },
  },
} as const

export const PUBLIC_MENU_ITEM_SELECT = {
  id: true,
  nameKu: true,
  nameEn: true,
  nameAr: true,
  descriptionKu: true,
  descriptionEn: true,
  descriptionAr: true,
  price: true,
  imageR2Url: true,
  imageMediaId: true,
  sortOrder: true,
  isActive: true,
  categoryId: true,
  ...PUBLIC_ITEM_ADVANCED_OPTIONS_SELECT,
} as const

type PublicItemRow = {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  descriptionKu: string | null
  descriptionEn: string | null
  descriptionAr: string | null
  price: number
  imageR2Url: string | null
  imageMediaId: string | null
  sortOrder: number
  isActive: boolean
  categoryId: string
  advancedOptionGroups: Array<{
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    selectionMode: string
    sortOrder: number
    options: Array<{
      id: string
      nameKu: string
      nameEn: string
      nameAr: string
      priceAdjustment: number | null
      sortOrder: number
    }>
  }>
  itemLevels: Array<{
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    value: number
    sortOrder: number
  }>
}

export function mapPublicAdvancedOptions(item: {
  advancedOptionGroups: PublicItemRow['advancedOptionGroups']
  itemLevels: PublicItemRow['itemLevels']
}): MenuItemAdvancedOptions {
  return {
    groups: item.advancedOptionGroups.map((group) => ({
      id: group.id,
      nameKu: group.nameKu,
      nameEn: group.nameEn,
      nameAr: group.nameAr,
      selectionMode: isAdvancedSelectionMode(group.selectionMode)
        ? group.selectionMode
        : 'multiple',
      sortOrder: group.sortOrder,
      options: group.options.map((option) => ({
        id: option.id,
        nameKu: option.nameKu,
        nameEn: option.nameEn,
        nameAr: option.nameAr,
        priceAdjustment:
          option.priceAdjustment === null || option.priceAdjustment === undefined
            ? null
            : Number(option.priceAdjustment),
        sortOrder: option.sortOrder,
      })),
    })),
    levels: item.itemLevels.map((level) => ({
      id: level.id,
      nameKu: level.nameKu,
      nameEn: level.nameEn,
      nameAr: level.nameAr,
      value: level.value,
      sortOrder: level.sortOrder,
    })),
  }
}

export function mapPublicMenuItem(item: PublicItemRow): MenuItem {
  const advancedOptions = mapPublicAdvancedOptions(item)
  const hasAdvancedOptions =
    advancedOptions.groups.length > 0 || advancedOptions.levels.length > 0

  return {
    id: item.id,
    nameKu: item.nameKu,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    descriptionKu: item.descriptionKu,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    price: Number(item.price),
    imageR2Url: item.imageR2Url,
    imageMediaId: item.imageMediaId,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    categoryId: item.categoryId,
    hasAdvancedOptions,
    advancedOptions: hasAdvancedOptions ? advancedOptions : undefined,
  }
}
