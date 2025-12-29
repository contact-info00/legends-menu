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

    // Get or create settings (singleton with fixed ID)
    let uiSettings = await prisma.uiSettings.findUnique({
      where: { id: 'ui-settings-1' },
    })
    
    if (!uiSettings) {
      // Create with defaults merged with provided values
      uiSettings = await prisma.uiSettings.create({
        data: {
          id: 'ui-settings-1',
          ...DEFAULT_SETTINGS,
          ...settings,
        },
      })
    } else {
      // Update existing settings
      uiSettings = await prisma.uiSettings.update({
        where: { id: 'ui-settings-1' },
        data: settings,
      })
    }

    return NextResponse.json({
      sectionTitleSize: uiSettings.sectionTitleSize,
      categoryTitleSize: uiSettings.categoryTitleSize,
      itemNameSize: uiSettings.itemNameSize,
      itemDescriptionSize: uiSettings.itemDescriptionSize,
      itemPriceSize: uiSettings.itemPriceSize,
      headerLogoSize: uiSettings.headerLogoSize,
      bottomNavSectionSize: (uiSettings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
      bottomNavCategorySize: (uiSettings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
    })
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

