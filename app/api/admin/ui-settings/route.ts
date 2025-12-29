import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

// Default values
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
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if uiSettings model exists in Prisma client
    if (!prisma.uiSettings) {
      console.error('UiSettings model not found in Prisma client. Please run: npx prisma generate')
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    // Get or create UI settings (singleton with fixed ID)
    let settings = await prisma.uiSettings.findUnique({
      where: { id: 'ui-settings-1' },
    })
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.uiSettings.create({
        data: {
          id: 'ui-settings-1',
          ...DEFAULT_SETTINGS,
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
    })
  } catch (error) {
    console.error('Error fetching UI settings:', error)
    // Return defaults on error
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    ]

    for (const field of fields) {
      const value = body[field]
      if (value === undefined) {
        continue // Skip if not provided
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
      console.warn('Column check/creation failed, continuing with update:', columnError?.message)
    }

    // Get or create settings (singleton with fixed ID)
    let uiSettings
    try {
      uiSettings = await prisma.uiSettings.findUnique({
        where: { id: 'ui-settings-1' },
      })
    } catch (findError: any) {
      // If findUnique fails due to missing columns, try raw SQL
      if (findError?.code === 'P2022' || findError?.message?.includes('does not exist')) {
        console.warn('Prisma query failed, using raw SQL fallback')
        const rawResult = await prisma.$queryRaw<Array<any>>`
          SELECT * FROM "UiSettings" WHERE id = 'ui-settings-1'
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
            id: 'ui-settings-1',
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
            `INSERT INTO "UiSettings" (id, ${columns}) VALUES ('ui-settings-1', ${values}) ON CONFLICT (id) DO UPDATE SET ${Object.keys(allData).map((k, i) => `"${k}" = $${i + 1}`).join(', ')}`,
            ...valueArray, ...valueArray
          )
          
          const rawResult = await prisma.$queryRaw<Array<any>>`
            SELECT * FROM "UiSettings" WHERE id = 'ui-settings-1'
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
          where: { id: 'ui-settings-1' },
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
              `UPDATE "UiSettings" SET ${setClauses.join(', ')} WHERE id = 'ui-settings-1'`,
              ...values
            )
            
            // Fetch updated record
            const rawResult = await prisma.$queryRaw<Array<any>>`
              SELECT * FROM "UiSettings" WHERE id = 'ui-settings-1'
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
    
    // Debug: Log response
    console.log('[DEBUG] PUT /api/admin/ui-settings - Response data:', JSON.stringify(responseData, null, 2))
    
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

