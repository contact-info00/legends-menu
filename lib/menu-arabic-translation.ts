import { AzureTranslatorError, translateEnglishTextsToArabic } from '@/lib/azure-translator'

type EnglishArabicPair = {
  englishKey: 'nameEn' | 'descriptionEn'
  arabicKey: 'nameAr' | 'descriptionAr'
  english: string
}

function normalizeEnglish(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function isMissingArabicTranslation(
  arabicValue: string | null | undefined,
  englishValue: string | null | undefined
): boolean {
  const arabic = (arabicValue ?? '').trim()
  if (!arabic) {
    return true
  }

  const english = normalizeEnglish(englishValue)
  if (!english) {
    return false
  }

  return arabic.toLowerCase() === english.toLowerCase()
}

function assertValidItemNameArabic(nameEn: string, nameAr: string): string {
  const trimmed = nameAr.trim()
  if (!trimmed) {
    throw new AzureTranslatorError()
  }

  if (trimmed.toLowerCase() === normalizeEnglish(nameEn).toLowerCase()) {
    throw new AzureTranslatorError()
  }

  return trimmed
}

export function englishTextChanged(
  incoming: string | null | undefined,
  existing: string | null | undefined
): boolean {
  return normalizeEnglish(incoming) !== normalizeEnglish(existing)
}

function stripClientArabicFields<T extends Record<string, unknown>>(body: T): T {
  const next = { ...body }
  delete next.nameAr
  delete next.descriptionAr
  return next
}

async function resolveArabicFields(
  pairs: EnglishArabicPair[],
  existing?: Partial<Record<'nameEn' | 'descriptionEn' | 'nameAr' | 'descriptionAr', string | null>>
): Promise<{ nameAr?: string; descriptionAr?: string | null }> {
  const result: { nameAr?: string; descriptionAr?: string | null } = {}
  const pending: Array<{ arabicKey: 'nameAr' | 'descriptionAr'; english: string }> = []

  for (const pair of pairs) {
    const existingEnglish = normalizeEnglish(existing?.[pair.englishKey])
    const incomingEnglish = normalizeEnglish(pair.english)
    const isCreate = existing === undefined
    const existingArabic =
      pair.arabicKey === 'nameAr' ? existing?.nameAr : existing?.descriptionAr
    const arabicNeedsTranslation =
      !isCreate && isMissingArabicTranslation(existingArabic, existingEnglish)
    const shouldTranslate = isCreate
      ? incomingEnglish.length > 0
      : englishTextChanged(incomingEnglish, existingEnglish) || arabicNeedsTranslation

    if (!shouldTranslate) {
      if (!isCreate && pair.arabicKey === 'nameAr') {
        result.nameAr = existing?.nameAr ?? undefined
      } else if (!isCreate && pair.arabicKey === 'descriptionAr') {
        result.descriptionAr = existing?.descriptionAr ?? null
      }
      continue
    }

    if (!incomingEnglish) {
      if (pair.arabicKey === 'nameAr') {
        throw new AzureTranslatorError()
      }
      result.descriptionAr = null
      continue
    }

    pending.push({ arabicKey: pair.arabicKey, english: incomingEnglish })
  }

  if (pending.length > 0) {
    const translations = await translateEnglishTextsToArabic(pending.map((entry) => entry.english))
    pending.forEach((entry, index) => {
      const translated = translations[index]?.trim()
      if (!translated) {
        throw new AzureTranslatorError()
      }
      if (entry.arabicKey === 'nameAr') {
        result.nameAr = translated
      } else {
        result.descriptionAr = translated
      }
    })
  }

  return result
}

export async function buildSectionCreateData(data: {
  nameKu: string
  nameEn: string
  nameAr?: string
  sortOrder?: number
  isActive?: boolean
}) {
  const arabic = await resolveArabicFields([{ englishKey: 'nameEn', arabicKey: 'nameAr', english: data.nameEn }])

  if (!arabic.nameAr?.trim()) {
    throw new AzureTranslatorError()
  }

  return {
    nameKu: data.nameKu,
    nameEn: data.nameEn,
    nameAr: arabic.nameAr,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
  }
}

export async function buildSectionUpdateData(
  body: Record<string, unknown>,
  existing: { nameKu: string; nameEn: string; nameAr: string; sortOrder: number; isActive: boolean }
) {
  const sanitized = stripClientArabicFields(body)
  const nameEn = typeof sanitized.nameEn === 'string' ? sanitized.nameEn : existing.nameEn

  const arabic = await resolveArabicFields(
    [{ englishKey: 'nameEn', arabicKey: 'nameAr', english: nameEn }],
    existing
  )

  return {
    ...sanitized,
    ...(sanitized.nameEn !== undefined ? { nameEn: sanitized.nameEn as string } : {}),
    ...(arabic.nameAr !== undefined ? { nameAr: arabic.nameAr } : {}),
  } as Record<string, unknown>
}

export async function buildCategoryCreateData(data: {
  sectionId: string
  nameKu: string
  nameEn: string
  nameAr?: string
  imageMediaId?: string | null
  sortOrder?: number
  isActive?: boolean
}) {
  const arabic = await resolveArabicFields([{ englishKey: 'nameEn', arabicKey: 'nameAr', english: data.nameEn }])

  if (!arabic.nameAr?.trim()) {
    throw new AzureTranslatorError()
  }

  return {
    sectionId: data.sectionId,
    nameKu: data.nameKu,
    nameEn: data.nameEn,
    nameAr: arabic.nameAr,
    imageMediaId: data.imageMediaId,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
  }
}

export async function buildCategoryUpdateData(
  body: Record<string, unknown>,
  existing: {
    nameKu: string
    nameEn: string
    nameAr: string
    sortOrder: number
    isActive: boolean
    imageMediaId: string | null
    imageR2Key: string | null
    imageR2Url: string | null
  }
) {
  const sanitized = stripClientArabicFields(body)
  const nameEn = typeof sanitized.nameEn === 'string' ? sanitized.nameEn : existing.nameEn

  const arabic = await resolveArabicFields(
    [{ englishKey: 'nameEn', arabicKey: 'nameAr', english: nameEn }],
    existing
  )

  return {
    ...sanitized,
    ...(sanitized.nameEn !== undefined ? { nameEn: sanitized.nameEn as string } : {}),
    ...(arabic.nameAr !== undefined ? { nameAr: arabic.nameAr } : {}),
  } as Record<string, unknown>
}

async function resolveItemNameArabic(
  nameEn: string,
  existing?: { nameEn: string; nameAr: string }
): Promise<string> {
  const arabic = await resolveArabicFields(
    [{ englishKey: 'nameEn', arabicKey: 'nameAr', english: nameEn }],
    existing
  )

  if (!arabic.nameAr?.trim()) {
    throw new AzureTranslatorError()
  }

  return assertValidItemNameArabic(nameEn, arabic.nameAr)
}

async function resolveItemDescriptionArabic(
  descriptionEn: string | null | undefined,
  existing?: { descriptionEn: string | null; descriptionAr: string | null }
): Promise<string | null> {
  const arabic = await resolveArabicFields(
    [
      {
        englishKey: 'descriptionEn',
        arabicKey: 'descriptionAr',
        english: descriptionEn ?? '',
      },
    ],
    existing
  )

  return arabic.descriptionAr ?? null
}

export async function buildItemCreateData(data: {
  categoryId: string
  nameKu: string
  nameEn: string
  nameAr?: string
  descriptionKu?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  price: number
  imageMediaId?: string | null
  sortOrder?: number
  isActive?: boolean
}) {
  const nameAr = await resolveItemNameArabic(data.nameEn)
  const descriptionAr = await resolveItemDescriptionArabic(data.descriptionEn)

  return {
    categoryId: data.categoryId,
    nameKu: data.nameKu,
    nameEn: data.nameEn,
    nameAr,
    descriptionKu: data.descriptionKu ?? null,
    descriptionEn: data.descriptionEn ?? null,
    descriptionAr,
    price: data.price,
    imageMediaId: data.imageMediaId,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
  }
}

export async function buildItemUpdateData(
  body: Record<string, unknown>,
  existing: {
    nameKu: string
    nameEn: string
    nameAr: string
    descriptionKu: string | null
    descriptionEn: string | null
    descriptionAr: string | null
    price: number
    sortOrder: number
    isActive: boolean
    imageMediaId: string | null
    imageR2Key: string | null
    imageR2Url: string | null
  }
) {
  const sanitized = stripClientArabicFields(body)
  const nameEn = typeof sanitized.nameEn === 'string' ? sanitized.nameEn : existing.nameEn
  const descriptionEn =
    sanitized.descriptionEn !== undefined
      ? (sanitized.descriptionEn as string | null)
      : existing.descriptionEn

  const nameArabic = await resolveArabicFields(
    [{ englishKey: 'nameEn', arabicKey: 'nameAr', english: nameEn }],
    existing
  )
  const descriptionArabic = await resolveArabicFields(
    [
      {
        englishKey: 'descriptionEn',
        arabicKey: 'descriptionAr',
        english: descriptionEn ?? '',
      },
    ],
    existing
  )

  return {
    ...sanitized,
    ...(sanitized.nameEn !== undefined ? { nameEn: sanitized.nameEn as string } : {}),
    ...(sanitized.descriptionEn !== undefined
      ? { descriptionEn: sanitized.descriptionEn as string | null }
      : {}),
    ...(nameArabic.nameAr !== undefined ? { nameAr: nameArabic.nameAr } : {}),
    ...(descriptionArabic.descriptionAr !== undefined
      ? { descriptionAr: descriptionArabic.descriptionAr }
      : {}),
  } as Record<string, unknown>
}

export { AzureTranslatorError }
