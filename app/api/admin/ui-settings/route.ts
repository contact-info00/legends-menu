import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateRestaurantCaches } from '@/lib/cache-invalidation'

export const dynamic = "force-dynamic"

// Default values
const DEFAULT_SETTINGS = {
  sectionTitleSize: 22,
  categoryTitleSize: 16,
  itemNameSize: 14,
  itemDescriptionSize: 14,
  itemPriceSize: 16,
  headerLogoSize: 32,
  bottomNavSectionSize: 13,
  bottomNavCategorySize: 13,
  currency: 'IQD', // Default currency
}

export async function GET() {
  const startTime = Date.now()
  try {
    const session = await requireAdminSession()

    // Check if uiSettings model exists in Prisma client
    if (!prisma.uiSettings) {
      console.error('UiSettings model not found in Prisma client. Please run: npx prisma generate')
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    // Get or create UI settings for this restaurant
    // Select only needed fields for better performance
    let settings = await prisma.uiSettings.findUnique({
      where: { restaurantId: session.restaurantId },
      select: {
        sectionTitleSize: true,
        categoryTitleSize: true,
        itemNameSize: true,
        itemDescriptionSize: true,
        itemPriceSize: true,
        headerLogoSize: true,
        bottomNavSectionSize: true,
        bottomNavCategorySize: true,
        currency: true,
      },
    })
    
    if (!settings) {
      // Create default settings if none exist (don't cache creation, needs to be fresh)
      settings = await prisma.uiSettings.create({
        data: {
          restaurantId: session.restaurantId,
          ...DEFAULT_SETTINGS,
        },
      })
    }

    const fetchTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] UI Settings fetch: ${fetchTime}ms`)
    }

    return NextResponse.json(
      {
        sectionTitleSize: settings.sectionTitleSize,
        categoryTitleSize: settings.categoryTitleSize,
        itemNameSize: settings.itemNameSize,
        itemDescriptionSize: settings.itemDescriptionSize,
        itemPriceSize: settings.itemPriceSize,
        headerLogoSize: settings.headerLogoSize,
        bottomNavSectionSize: (settings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
        bottomNavCategorySize: (settings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
        currency: (settings as any).currency ?? DEFAULT_SETTINGS.currency,
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching UI settings:', error)
    // Return defaults on error
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession()

    const body = await request.json()
    
    // Debug: Log incoming request
    console.log('[DEBUG] PUT /api/admin/ui-settings - Request body:', JSON.stringify(body, null, 2))

    // Validation
    const errors: string[] = []
    const settings: any = {}

    const fields = [
      'sectionTitleSize',
      'categoryTitleSize',
      'itemNameSize',
      'itemDescriptionSize',
      'itemPriceSize',
      'headerLogoSize',
      'bottomNavSectionSize',
      'bottomNavCategorySize',
      'currency',
    ]

    for (const field of fields) {
      const value = body[field]
      if (value === undefined) {
        continue // Skip if not provided
      }

      // Special handling for currency field
      if (field === 'currency') {
        if (value !== 'IQD' && value !== 'USD') {
          errors.push(`${field} must be either 'IQD' or 'USD'`)
        } else {
          settings[field] = value
        }
        continue
      }

      const numValue = parseInt(String(value), 10)
      if (isNaN(numValue)) {
        errors.push(`${field} must be a number`)
      } else {
        // Different validation for logo size (can be smaller)
        if (field === 'headerLogoSize') {
          if (numValue < 16 || numValue > 80) {
            errors.push(`${field} must be between 16 and 80`)
          } else {
            settings[field] = numValue
          }
        } else {
          if (numValue < 10 || numValue > 40) {
            errors.push(`${field} must be between 10 and 40`)
          } else {
            settings[field] = numValue
          }
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // Check if uiSettings model exists in Prisma client
    if (!prisma.uiSettings) {
      console.error('UiSettings model not found in Prisma client. Please run: npx prisma generate')
      return NextResponse.json(
        { error: 'Database model not available. Please restart the server after running: npx prisma generate' },
        { status: 500 }
      )
    }

    // Get or create settings for this restaurant
    let uiSettings
    try {
      uiSettings = await prisma.uiSettings.findUnique({
        where: { restaurantId: session.restaurantId },
      })
      } catch (findError: any) {
      // If findUnique fails due to missing columns, try raw SQL
      if (findError?.code === 'P2022' || findError?.message?.includes('does not exist')) {
        console.warn('Prisma query failed, using raw SQL fallback')
        const rawResult = await prisma.$queryRaw<Array<any>>`
          SELECT * FROM "UiSettings" WHERE "restaurantId" = ${session.restaurantId}
        `
        uiSettings = rawResult[0] || null
      } else {
        throw findError
      }
    }
    
    if (!uiSettings) {
      // Create with defaults merged with provided values
      try {
        uiSettings = await prisma.uiSettings.create({
          data: {
            restaurantId: session.restaurantId,
            ...DEFAULT_SETTINGS,
            ...settings,
          },
        })
      } catch (createError: any) {
        // If create fails due to missing columns, use raw SQL
        if (createError?.code === 'P2022' || createError?.message?.includes('does not exist')) {
          console.warn('Prisma create failed, using raw SQL fallback')
          const allData = { ...DEFAULT_SETTINGS, ...settings }
          const columns = Object.keys(allData).map(k => `"${k}"`).join(', ')
          const values = Object.values(allData).map((_, i) => `$${i + 1}`).join(', ')
          const valueArray = Object.values(allData)
          
          await prisma.$executeRawUnsafe(
            `INSERT INTO "UiSettings" ("restaurantId", ${columns}) VALUES ($1, ${values}) ON CONFLICT ("restaurantId") DO UPDATE SET ${Object.keys(allData).map((k, i) => `"${k}" = $${i + 2}`).join(', ')}`,
            session.restaurantId, ...valueArray, ...valueArray
          )
          
          const rawResult = await prisma.$queryRaw<Array<any>>`
            SELECT * FROM "UiSettings" WHERE "restaurantId" = ${session.restaurantId}
          `
          uiSettings = rawResult[0]
        } else {
          throw createError
        }
      }
    } else {
      // Update existing settings
      const updateData: any = { ...settings }
      
      // Debug: Log what we're about to update
      console.log('[DEBUG] PUT /api/admin/ui-settings - Updating with data:', JSON.stringify(updateData, null, 2))
      
      try {
        uiSettings = await prisma.uiSettings.update({
          where: { restaurantId: session.restaurantId },
          data: updateData,
        })
        
        // Debug: Log what was actually saved
        console.log('[DEBUG] PUT /api/admin/ui-settings - Updated record:', JSON.stringify(uiSettings, null, 2))
      } catch (updateError: any) {
        // If update fails due to missing columns, use raw SQL
        if (updateError?.code === 'P2022' || updateError?.message?.includes('does not exist')) {
          console.warn('Prisma update failed, using raw SQL fallback')
          const setClauses: string[] = []
          const values: any[] = []
          let paramIndex = 1
          
          for (const [key, value] of Object.entries(updateData)) {
            setClauses.push(`"${key}" = $${paramIndex}`)
            values.push(value)
            paramIndex++
          }
          
          if (setClauses.length > 0) {
            await prisma.$executeRawUnsafe(
              `UPDATE "UiSettings" SET ${setClauses.join(', ')} WHERE "restaurantId" = $${paramIndex}`,
              ...values, session.restaurantId
            )
            
            // Fetch updated record
            const rawResult = await prisma.$queryRaw<Array<any>>`
              SELECT * FROM "UiSettings" WHERE "restaurantId" = ${session.restaurantId}
            `
            uiSettings = rawResult[0] || uiSettings
          }
        } else {
          throw updateError
        }
      }
    }

    const responseData = {
      sectionTitleSize: uiSettings.sectionTitleSize,
      categoryTitleSize: uiSettings.categoryTitleSize,
      itemNameSize: uiSettings.itemNameSize,
      itemDescriptionSize: uiSettings.itemDescriptionSize,
      itemPriceSize: uiSettings.itemPriceSize,
      headerLogoSize: uiSettings.headerLogoSize,
      bottomNavSectionSize: (uiSettings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
      bottomNavCategorySize: (uiSettings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
    }
    
    // Update the fallback settings in database with the new UI settings
    try {
      await prisma.fallbackSettings.upsert({
        where: { id: 'fallback-1' },
        update: {
          sectionTitleSize: uiSettings.sectionTitleSize,
          categoryTitleSize: uiSettings.categoryTitleSize,
          itemNameSize: uiSettings.itemNameSize,
          itemDescriptionSize: uiSettings.itemDescriptionSize,
          itemPriceSize: uiSettings.itemPriceSize,
          headerLogoSize: uiSettings.headerLogoSize,
          bottomNavSectionSize: (uiSettings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
          bottomNavCategorySize: (uiSettings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
        },
        create: {
          id: 'fallback-1',
          nameKu: 'رێستۆرانتی',
          nameEn: 'Restaurant',
          nameAr: 'مطعم',
          sectionTitleSize: uiSettings.sectionTitleSize,
          categoryTitleSize: uiSettings.categoryTitleSize,
          itemNameSize: uiSettings.itemNameSize,
          itemDescriptionSize: uiSettings.itemDescriptionSize,
          itemPriceSize: uiSettings.itemPriceSize,
          headerLogoSize: uiSettings.headerLogoSize,
          bottomNavSectionSize: (uiSettings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
          bottomNavCategorySize: (uiSettings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
        },
      })
      console.log('✅ Updated fallback settings in database with UI settings')
    } catch (error) {
      console.error('⚠️ Error updating fallback settings (non-critical):', error)
      // Don't fail the request if fallback update fails
    }
    
    // Debug: Log response
    console.log('[DEBUG] PUT /api/admin/ui-settings - Response data:', JSON.stringify(responseData, null, 2))

    invalidateRestaurantCaches(session.restaurantId)

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Error updating UI settings:', error)
    // If error is due to missing columns, suggest running migration
    if (error?.message?.includes('bottomNavSectionSize') || error?.message?.includes('bottomNavCategorySize') || error?.code === 'P2021') {
      console.warn('UiSettings columns missing. Run migration: npx prisma migrate deploy')
      return NextResponse.json(
        {
          error: 'Database schema mismatch',
          message: 'Missing columns in UiSettings table. Please run: npx prisma migrate deploy',
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

