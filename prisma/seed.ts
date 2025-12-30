import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to generate slug from restaurant name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user with PIN 1234
  const pin = '1234'
  const pinHash = await bcrypt.hash(pin, 10)
  
  const admin = await prisma.adminUser.upsert({
    where: { id: 'admin-1' },
    update: {},
    create: {
      id: 'admin-1',
      pinHash,
    },
  })

  console.log('✅ Admin user created')
  console.log('🔐 Default PIN: 1234')
  console.log('⚠️  Please change the PIN after first login!')

  // Ensure "Legends Restaurant" exists with slug "legends-restaurant"
  const legendsSlug = 'legends-restaurant'
  const legendsNameEn = 'Legends Restaurant'
  
  // Check if restaurant with slug "legends-restaurant" already exists
  const existingLegendsRestaurant = await prisma.restaurant.findUnique({
    where: { slug: legendsSlug },
  })
  
  let restaurant
  if (existingLegendsRestaurant) {
    // Restaurant already exists, use it
    console.log(`✅ Restaurant "${legendsNameEn}" already exists with slug "${legendsSlug}"`)
    restaurant = existingLegendsRestaurant
  } else {
    // Create "Legends Restaurant" if it doesn't exist
    restaurant = await prisma.restaurant.upsert({
      where: { slug: legendsSlug },
      update: {
        // Ensure name and slug are correct
        nameEn: legendsNameEn,
        slug: legendsSlug,
      },
      create: {
        slug: legendsSlug,
        nameKu: 'رێستۆرانتی لێجەندز',
        nameEn: legendsNameEn,
        nameAr: 'مطعم الأساطير',
        googleMapsUrl: 'https://maps.google.com',
      phoneNumber: '+9647501234567',
      brandColors: {
        menuGradientStart: '#5C0015',
        menuGradientEnd: '#800020',
        headerText: '#FFFFFF',
        headerIcons: '#FFFFFF',
        activeTab: '#FFFFFF',
        inactiveTab: '#CCCCCC',
        categoryCardBg: '#4A5568',
        itemCardBg: '#4A5568',
        itemNameText: '#FFFFFF',
        itemDescText: '#E2E8F0',
        priceText: '#FBBF24',
        dividerLine: '#718096',
        modalBg: '#2D3748',
        modalOverlay: 'rgba(0,0,0,0.7)',
        buttonBg: '#800020',
        buttonText: '#FFFFFF',
        feedbackCardBg: '#4A5568',
        feedbackCardText: '#FFFFFF',
        welcomeOverlayColor: '#000000',
        welcomeOverlayOpacity: 0.5,
      },
    },
    })
  }

  console.log(`✅ Restaurant "${restaurant.nameEn}" ensured (slug: ${restaurant.slug})`)

  // Only create sections if restaurant was just created (has no sections yet)
  const existingSections = await prisma.section.findMany({
    where: { restaurantId: restaurant.id },
  })

  let menuSection, shishaSection, drinksSection

  if (existingSections.length === 0) {
    // Create sections only if restaurant is new
    console.log('📋 Creating sections for new restaurant...')
    
    menuSection = await prisma.section.create({
      data: {
        restaurantId: restaurant.id,
        nameKu: 'مێنوو',
        nameEn: 'Menu',
        nameAr: 'قائمة الطعام',
        sortOrder: 1,
        isActive: true,
      },
    })

    shishaSection = await prisma.section.create({
    data: {
      restaurantId: restaurant.id,
      nameKu: 'شیشە',
      nameEn: 'Shisha',
      nameAr: 'الشيشة',
      sortOrder: 2,
      isActive: true,
    },
  })

    drinksSection = await prisma.section.create({
      data: {
        restaurantId: restaurant.id,
        nameKu: 'خواردنەوەکان',
        nameEn: 'Drinks',
        nameAr: 'المشروبات',
        sortOrder: 3,
        isActive: true,
      },
    })

    console.log('✅ Sections created')

    // Create categories for Menu section
    const appetizersCategory = await prisma.category.create({
      data: {
        sectionId: menuSection.id,
        nameKu: 'پێشخوارد',
        nameEn: 'Appetizers',
        nameAr: 'المقبلات',
        sortOrder: 1,
        isActive: true,
      },
    })

    const mainDishesCategory = await prisma.category.create({
      data: {
        sectionId: menuSection.id,
        nameKu: 'خواردنی سەرەکی',
        nameEn: 'Main Dishes',
        nameAr: 'الأطباق الرئيسية',
        sortOrder: 2,
        isActive: true,
      },
    })

    // Create categories for Shisha section
    const classicShishaCategory = await prisma.category.create({
      data: {
        sectionId: shishaSection.id,
        nameKu: 'کلاسیک',
        nameEn: 'Classic',
        nameAr: 'كلاسيكي',
        sortOrder: 1,
        isActive: true,
      },
    })

    // Create categories for Drinks section
    const hotDrinksCategory = await prisma.category.create({
      data: {
        sectionId: drinksSection.id,
        nameKu: 'خواردنەوەی گەرم',
        nameEn: 'Hot Drinks',
        nameAr: 'مشروبات ساخنة',
        sortOrder: 1,
        isActive: true,
      },
    })

    const coldDrinksCategory = await prisma.category.create({
      data: {
        sectionId: drinksSection.id,
        nameKu: 'خواردنەوەی سارد',
        nameEn: 'Cold Drinks',
        nameAr: 'مشروبات باردة',
        sortOrder: 2,
        isActive: true,
      },
    })

    console.log('✅ Categories created')

    // Create sample items
    await prisma.item.createMany({
      data: [
      {
        categoryId: appetizersCategory.id,
        nameKu: 'هوموس',
        nameEn: 'Hummus',
        nameAr: 'حمص',
        descriptionKu: 'حمصی تازە لەگەڵ زەیتوون',
        descriptionEn: 'Fresh hummus with olives',
        descriptionAr: 'حمص طازج مع زيتون',
        price: 5.00,
        sortOrder: 1,
        isActive: true,
      },
      {
        categoryId: appetizersCategory.id,
        nameKu: 'تابولی',
        nameEn: 'Tabbouleh',
        nameAr: 'تبولة',
        descriptionKu: 'سالاتی تازە لەگەڵ پودینگ',
        descriptionEn: 'Fresh salad with parsley',
        descriptionAr: 'سلطة طازجة مع البقدونس',
        price: 4.50,
        sortOrder: 2,
        isActive: true,
      },
      {
        categoryId: mainDishesCategory.id,
        nameKu: 'کەباب',
        nameEn: 'Kebab',
        nameAr: 'كباب',
        descriptionKu: 'کەبابی تازە لەگەڵ برنج',
        descriptionEn: 'Fresh kebab with rice',
        descriptionAr: 'كباب طازج مع أرز',
        price: 12.00,
        sortOrder: 1,
        isActive: true,
      },
      {
        categoryId: mainDishesCategory.id,
        nameKu: 'شاوەرما',
        nameEn: 'Shawarma',
        nameAr: 'شاورما',
        descriptionKu: 'شاوەرمای تازە لەگەڵ سەوس',
        descriptionEn: 'Fresh shawarma with sauce',
        descriptionAr: 'شاورما طازجة مع الصلصة',
        price: 8.00,
        sortOrder: 2,
        isActive: true,
      },
      {
        categoryId: classicShishaCategory.id,
        nameKu: 'شیشەی کلاسیک',
        nameEn: 'Classic Shisha',
        nameAr: 'شيشة كلاسيكية',
        descriptionKu: 'شیشەی کلاسیک بە تەمە جیاواز',
        descriptionEn: 'Classic shisha with various flavors',
        descriptionAr: 'شيشة كلاسيكية بنكهات متنوعة',
        price: 15.00,
        sortOrder: 1,
        isActive: true,
      },
      {
        categoryId: hotDrinksCategory.id,
        nameKu: 'چای',
        nameEn: 'Tea',
        nameAr: 'شاي',
        descriptionKu: 'چای تازە',
        descriptionEn: 'Fresh tea',
        descriptionAr: 'شاي طازج',
        price: 2.00,
        sortOrder: 1,
        isActive: true,
      },
      {
        categoryId: hotDrinksCategory.id,
        nameKu: 'قاوە',
        nameEn: 'Coffee',
        nameAr: 'قهوة',
        descriptionKu: 'قاوەی تازە',
        descriptionEn: 'Fresh coffee',
        descriptionAr: 'قهوة طازجة',
        price: 3.00,
        sortOrder: 2,
        isActive: true,
      },
      {
        categoryId: coldDrinksCategory.id,
        nameKu: 'لیمۆناد',
        nameEn: 'Lemonade',
        nameAr: 'ليمونادة',
        descriptionKu: 'لیمۆنادی تازە',
        descriptionEn: 'Fresh lemonade',
        descriptionAr: 'ليمونادة طازجة',
        price: 3.50,
        sortOrder: 1,
        isActive: true,
      },
      {
        categoryId: coldDrinksCategory.id,
        nameKu: 'جوس',
        nameEn: 'Juice',
        nameAr: 'عصير',
        descriptionKu: 'جوسی تازە',
        descriptionEn: 'Fresh juice',
        descriptionAr: 'عصير طازج',
        price: 4.00,
        sortOrder: 2,
        isActive: true,
      },
      ],
    })

    console.log('✅ Sample items created')
  } else {
    // Restaurant already has sections, find them
    console.log(`✅ Restaurant already has ${existingSections.length} section(s), skipping section/category/item creation`)
  }

  // Create UI settings with defaults
  await prisma.uiSettings.upsert({
    where: { id: 'ui-settings-1' },
    update: {},
    create: {
      id: 'ui-settings-1',
      sectionTitleSize: 22,
      categoryTitleSize: 16,
      itemNameSize: 14,
      itemDescriptionSize: 14,
      itemPriceSize: 16,
      headerLogoSize: 32,
      bottomNavSectionSize: 13,
      bottomNavCategorySize: 13,
    },
  })

  console.log('✅ UI settings created')

  // Create theme with defaults
  await prisma.theme.upsert({
    where: { id: 'theme-1' },
    update: {},
    create: {
      id: 'theme-1',
      appBg: '#400810',
    },
  })

  console.log('✅ Theme created')
  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



