import { PrismaClient } from '@prisma/client'
import { normalizeArabicScriptForDisplay, containsArabicPresentationForms } from '../lib/arabic-script-normalize'

const SAMPLE = 'بروسکێتای پۆمۆدۆرۆ'

async function main() {
  const prisma = new PrismaClient()
  const items = await prisma.item.findMany({
    select: { nameKu: true },
    orderBy: { sortOrder: 'asc' },
  })

  let presentationFormCount = 0

  for (const item of items) {
    const raw = item.nameKu ?? ''
    if (!raw.trim()) continue

    const normalized = normalizeArabicScriptForDisplay(raw)
    const hadPresentationForms = containsArabicPresentationForms(raw)

    if (hadPresentationForms) {
      presentationFormCount += 1
      console.log('FIXED presentation forms:')
      console.log('  raw:        ', raw)
      console.log('  normalized: ', normalized)
      console.log()
    }
  }

  const bruschetta = items.find((item) => normalizeArabicScriptForDisplay(item.nameKu) === SAMPLE)
  console.log(`Items with presentation forms: ${presentationFormCount}`)
  console.log(`Sample "${SAMPLE}" renders after normalization: ${Boolean(bruschetta)}`)

  await prisma.$disconnect()
}

main()
