export const ADVANCED_SELECTION_MODES = ['single', 'multiple'] as const
export type AdvancedSelectionMode = (typeof ADVANCED_SELECTION_MODES)[number]

export const ITEM_LEVEL_MIN = 1
export const ITEM_LEVEL_MAX = 5

export function isAdvancedSelectionMode(value: unknown): value is AdvancedSelectionMode {
  return value === 'single' || value === 'multiple'
}

export function parseItemLevelValue(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n) || n < ITEM_LEVEL_MIN || n > ITEM_LEVEL_MAX) {
    return null
  }
  return n
}

export function parseOptionalPriceAdjustment(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null || value === '') {
    return null
  }
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) {
    return undefined
  }
  return n
}

/** Public / admin payload shape for an item's advanced options config. */
export type AdvancedOptionsPayload = {
  groups: Array<{
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    selectionMode: AdvancedSelectionMode
    sortOrder: number
    isActive: boolean
    options: Array<{
      id: string
      nameKu: string
      nameEn: string
      nameAr: string
      priceAdjustment: number | null
      sortOrder: number
      isActive: boolean
    }>
  }>
  levels: Array<{
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    value: number
    sortOrder: number
    isActive: boolean
  }>
}

export function mapAdvancedOptionsPayload(data: {
  groups: Array<{
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    selectionMode: string
    sortOrder: number
    isActive: boolean
    options: Array<{
      id: string
      nameKu: string
      nameEn: string
      nameAr: string
      priceAdjustment: number | null
      sortOrder: number
      isActive: boolean
    }>
  }>
  levels: Array<{
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    value: number
    sortOrder: number
    isActive: boolean
  }>
}): AdvancedOptionsPayload {
  return {
    groups: data.groups.map((group) => ({
      id: group.id,
      nameKu: group.nameKu,
      nameEn: group.nameEn,
      nameAr: group.nameAr,
      selectionMode: isAdvancedSelectionMode(group.selectionMode)
        ? group.selectionMode
        : 'single',
      sortOrder: group.sortOrder,
      isActive: group.isActive,
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
        isActive: option.isActive,
      })),
    })),
    levels: data.levels.map((level) => ({
      id: level.id,
      nameKu: level.nameKu,
      nameEn: level.nameEn,
      nameAr: level.nameAr,
      value: level.value,
      sortOrder: level.sortOrder,
      isActive: level.isActive,
    })),
  }
}
