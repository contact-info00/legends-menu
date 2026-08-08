interface AdminNamedEntity {
  nameEn: string
  nameKu: string
  nameAr: string
}

/** Admin Menu Builder always prefers English; falls back without mutating data. */
export function getAdminMenuName(entity: AdminNamedEntity): string {
  const english = entity.nameEn?.trim()
  if (english) return english

  const kurdish = entity.nameKu?.trim()
  if (kurdish) return kurdish

  const arabic = entity.nameAr?.trim()
  if (arabic) return arabic

  return 'Untitled'
}
