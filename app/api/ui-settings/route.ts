import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default values (same as admin endpoint)
const DEFAULT_SETTINGS = {
  sectionTitleSize: 22,
  categoryTitleSize: 18,
  itemNameSize: 16,
  itemDescriptionSize: 14,
  itemPriceSize: 16,
  headerLogoSize: 32,
  bottomNavSectionSize: 18,
  bottomNavCategorySize: 15,
}

export async function GET() {
  try {
    // Public endpoint - no auth required
    // Check if uiSettings model exists in Prisma client
    if (!prisma.uiSettings) {
      console.error('UiSettings model not found in Prisma client. Returning defaults.')
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    // Check if bottomNav columns exist, and add them if missing
    try {
      const columnCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'UiSettings' 
        AND column_name IN ('bottomNavSectionSize', 'bottomNavCategorySize')
      `
      
      const existingColumns = columnCheck.map(row => row.column_name)
      
      // Add missing columns if they don't exist
      if (!existingColumns.includes('bottomNavCategorySize')) {
        await prisma.$executeRaw`
          ALTER TABLE "UiSettings" 
          ADD COLUMN "bottomNavCategorySize" INTEGER NOT NULL DEFAULT 15
        `
        console.log('Added missing column: bottomNavCategorySize')
      }
      
      if (!existingColumns.includes('bottomNavSectionSize')) {
        await prisma.$executeRaw`
          ALTER TABLE "UiSettings" 
          ADD COLUMN "bottomNavSectionSize" INTEGER NOT NULL DEFAULT 18
        `
        console.log('Added missing column: bottomNavSectionSize')
      }
    } catch (columnError: any) {
      // If column check fails, log but continue (columns might already exist)
      console.warn('Column check/creation failed, continuing with query:', columnError?.message)
    }

    let settings
    try {
      settings = await prisma.uiSettings.findUnique({
        where: { id: 'ui-settings-1' },
      })
      console.log('[DEBUG] GET /api/ui-settings - Raw database record:', JSON.stringify(settings, null, 2))
    } catch (findError: any) {
      // If findUnique fails due to missing columns, try raw SQL
      if (findError?.code === 'P2022' || findError?.message?.includes('does not exist')) {
        console.warn('Prisma query failed, using raw SQL fallback')
        const rawResult = await prisma.$queryRaw<Array<any>>`
          SELECT * FROM "UiSettings" WHERE id = 'ui-settings-1'
        `
        settings = rawResult[0] || null
      } else {
        throw findError
      }
    }
    
    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json(DEFAULT_SETTINGS, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }

    return NextResponse.json({
      sectionTitleSize: settings.sectionTitleSize,
      categoryTitleSize: settings.categoryTitleSize,
      itemNameSize: settings.itemNameSize,
      itemDescriptionSize: settings.itemDescriptionSize,
      itemPriceSize: settings.itemPriceSize,
      headerLogoSize: settings.headerLogoSize,
      bottomNavSectionSize: (settings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
      bottomNavCategorySize: (settings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error fetching UI settings:', error)
    // If error is due to missing columns, return defaults
    if (error?.message?.includes('bottomNavSectionSize') || error?.message?.includes('bottomNavCategorySize') || error?.code === 'P2021' || error?.code === 'P2022') {
      console.warn('UiSettings columns missing, returning defaults. Run migration to add columns.')
    }
    // Return defaults on error
    return NextResponse.json(DEFAULT_SETTINGS, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

