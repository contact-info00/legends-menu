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
}

export async function GET() {
  try {
    // Public endpoint - no auth required
    // Check if uiSettings model exists in Prisma client
    if (!prisma.uiSettings) {
      console.error('UiSettings model not found in Prisma client. Returning defaults.')
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    const settings = await prisma.uiSettings.findUnique({
      where: { id: 'ui-settings-1' },
    })
    
    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    return NextResponse.json({
      sectionTitleSize: settings.sectionTitleSize,
      categoryTitleSize: settings.categoryTitleSize,
      itemNameSize: settings.itemNameSize,
      itemDescriptionSize: settings.itemDescriptionSize,
      itemPriceSize: settings.itemPriceSize,
      headerLogoSize: settings.headerLogoSize,
    })
  } catch (error) {
    console.error('Error fetching UI settings:', error)
    // Return defaults on error
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

