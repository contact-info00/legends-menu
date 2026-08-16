import { AzureTranslatorError, translateEnglishTextsToArabic } from '@/lib/azure-translator'
import { englishTextChanged } from '@/lib/menu-arabic-translation'

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

function stripClientArabicFields<T extends Record<string, unknown>>(body: T): T {
  const next = { ...body }
  delete next.nameAr
  return next
}

/**
 * Resolve Arabic for a single name field.
 * Translates on create, when English changes, or when existing Arabic is missing/invalid.
 * Changing only Kurdish does not call Azure.
 */
async function resolveNameArabic(
  nameEn: string,
  existing?: { nameEn: string; nameAr: string }
): Promise<string> {
  const incomingEnglish = normalizeEnglish(nameEn)

  if (existing) {
    const shouldTranslate =
      englishTextChanged(incomingEnglish, existing.nameEn) ||
      isMissingArabicTranslation(existing.nameAr, existing.nameEn)

    if (!shouldTranslate) {
      return existing.nameAr
    }
  }

  if (!incomingEnglish) {
    throw new AzureTranslatorError()
  }

  const [translated] = await translateEnglishTextsToArabic([incomingEnglish])
  const trimmed = translated?.trim()
  if (!trimmed) {
    throw new AzureTranslatorError()
  }

  return trimmed
}

export async function buildNamedEntityCreateData(data: {
  nameKu: string
  nameEn: string
}) {
  const nameAr = await resolveNameArabic(data.nameEn)
  return {
    nameKu: data.nameKu.trim(),
    nameEn: data.nameEn.trim(),
    nameAr,
  }
}

export async function buildNamedEntityUpdateData(
  body: Record<string, unknown>,
  existing: { nameKu: string; nameEn: string; nameAr: string }
) {
  const sanitized = stripClientArabicFields(body)
  const nameEn =
    typeof sanitized.nameEn === 'string' ? sanitized.nameEn : existing.nameEn
  const nameKu =
    typeof sanitized.nameKu === 'string' ? sanitized.nameKu : existing.nameKu

  const nameAr = await resolveNameArabic(nameEn, existing)

  return {
    ...sanitized,
    nameKu,
    nameEn,
    nameAr,
  } as Record<string, unknown>
}

export { AzureTranslatorError }
