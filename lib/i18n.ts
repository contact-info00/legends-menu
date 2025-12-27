export type Language = 'ku' | 'en' | 'ar'

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ku', name: 'Kurdish', nativeName: 'کوردی' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
]

export function getLocalizedText(
  text: { nameKu: string; nameEn: string; nameAr: string },
  lang: Language
): string {
  switch (lang) {
    case 'ku':
      return text.nameKu
    case 'en':
      return text.nameEn
    case 'ar':
      return text.nameAr
    default:
      return text.nameEn
  }
}

export function getLocalizedDescription(
  text: { descriptionKu?: string | null; descriptionEn?: string | null; descriptionAr?: string | null },
  lang: Language
): string {
  switch (lang) {
    case 'ku':
      return text.descriptionKu || text.descriptionEn || ''
    case 'en':
      return text.descriptionEn || ''
    case 'ar':
      return text.descriptionAr || text.descriptionEn || ''
    default:
      return text.descriptionEn || ''
  }
}




