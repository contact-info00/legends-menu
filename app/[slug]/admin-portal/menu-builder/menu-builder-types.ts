export interface Item {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  descriptionKu?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  price: number
  imageMediaId: string | null
  imageR2Key?: string | null
  imageR2Url?: string | null
  sortOrder: number
  isActive: boolean
}

export interface Category {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  imageMediaId: string | null
  imageR2Key?: string | null
  imageR2Url?: string | null
  sortOrder: number
  isActive: boolean
  items: Item[]
}

export interface Section {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  sortOrder: number
  isActive: boolean
  categories: Category[]
}

export type MenuEntityType = 'section' | 'category' | 'item'

/** Only sections and categories own a "3 dots" dropdown. */
export type MenuRowType = 'section' | 'category'
