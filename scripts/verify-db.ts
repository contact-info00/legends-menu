import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDatabase() {
  console.log('🔍 Verifying database structure...\n')

  try {
    // Check Theme table
    console.log('📋 Checking Theme table...')
    const theme = await prisma.theme.findUnique({
      where: { id: 'theme-1' },
      include: { backgroundImage: true },
    })
    if (theme) {
      console.log('✅ Theme table exists')
      console.log(`   - id: ${theme.id}`)
      console.log(`   - appBg: ${theme.appBg}`)
      console.log(`   - backgroundImageMediaId: ${theme.backgroundImageMediaId || 'null'}`)
      console.log(`   - createdAt: ${theme.createdAt}`)
      console.log(`   - updatedAt: ${theme.updatedAt}`)
    } else {
      console.log('⚠️  Theme table exists but no record found')
    }

    // Check Media table
    console.log('\n📋 Checking Media table...')
    const mediaCount = await prisma.media.count()
    console.log(`✅ Media table exists with ${mediaCount} records`)

    // Check Section table
    console.log('\n📋 Checking Section table...')
    const sectionCount = await prisma.section.count()
    const sampleSection = await prisma.section.findFirst({
      select: {
        id: true,
        nameEn: true,
        sortOrder: true,
        isActive: true,
      },
    })
    console.log(`✅ Section table exists with ${sectionCount} records`)
    if (sampleSection) {
      console.log(`   Sample: ${sampleSection.nameEn} (sortOrder: ${sampleSection.sortOrder}, isActive: ${sampleSection.isActive})`)
    }

    // Check Category table
    console.log('\n📋 Checking Category table...')
    const categoryCount = await prisma.category.count()
    const sampleCategory = await prisma.category.findFirst({
      select: {
        id: true,
        nameEn: true,
        sortOrder: true,
        isActive: true,
        imageMediaId: true,
      },
    })
    console.log(`✅ Category table exists with ${categoryCount} records`)
    if (sampleCategory) {
      console.log(`   Sample: ${sampleCategory.nameEn} (sortOrder: ${sampleCategory.sortOrder}, isActive: ${sampleCategory.isActive}, imageMediaId: ${sampleCategory.imageMediaId || 'null'})`)
    }

    // Check Item table
    console.log('\n📋 Checking Item table...')
    const itemCount = await prisma.item.count()
    const sampleItem = await prisma.item.findFirst({
      select: {
        id: true,
        nameEn: true,
        sortOrder: true,
        isActive: true,
        imageMediaId: true,
      },
    })
    console.log(`✅ Item table exists with ${itemCount} records`)
    if (sampleItem) {
      console.log(`   Sample: ${sampleItem.nameEn} (sortOrder: ${sampleItem.sortOrder}, isActive: ${sampleItem.isActive}, imageMediaId: ${sampleItem.imageMediaId || 'null'})`)
    }

    // Check Restaurant table
    console.log('\n📋 Checking Restaurant table...')
    const restaurantCount = await prisma.restaurant.count()
    console.log(`✅ Restaurant table exists with ${restaurantCount} records`)

    // Check AdminUser table
    console.log('\n📋 Checking AdminUser table...')
    const adminCount = await prisma.adminUser.count()
    console.log(`✅ AdminUser table exists with ${adminCount} records`)

    // Check Feedback table
    console.log('\n📋 Checking Feedback table...')
    const feedbackCount = await prisma.feedback.count()
    console.log(`✅ Feedback table exists with ${feedbackCount} records`)

    // Check UiSettings table
    console.log('\n📋 Checking UiSettings table...')
    const uiSettings = await prisma.uiSettings.findUnique({
      where: { id: 'ui-settings-1' },
    })
    if (uiSettings) {
      console.log('✅ UiSettings table exists')
      console.log(`   - sectionTitleSize: ${uiSettings.sectionTitleSize}`)
      console.log(`   - categoryTitleSize: ${uiSettings.categoryTitleSize}`)
      console.log(`   - itemNameSize: ${uiSettings.itemNameSize}`)
    } else {
      console.log('⚠️  UiSettings table exists but no record found')
    }

    console.log('\n✅ Database verification complete!')
    console.log('\n📊 Summary:')
    console.log(`   - Theme: ✅ (with backgroundImageMediaId field)`)
    console.log(`   - Media: ✅ (${mediaCount} records)`)
    console.log(`   - Section: ✅ (${sectionCount} records, with sortOrder)`)
    console.log(`   - Category: ✅ (${categoryCount} records, with sortOrder)`)
    console.log(`   - Item: ✅ (${itemCount} records, with sortOrder)`)
    console.log(`   - Restaurant: ✅ (${restaurantCount} records)`)
    console.log(`   - AdminUser: ✅ (${adminCount} records)`)
    console.log(`   - Feedback: ✅ (${feedbackCount} records)`)
    console.log(`   - UiSettings: ✅`)

  } catch (error: any) {
    console.error('❌ Error verifying database:', error.message)
    if (error.code === 'P2001') {
      console.error('   This might indicate a missing table or field.')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyDatabase()




