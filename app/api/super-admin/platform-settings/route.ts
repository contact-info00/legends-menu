import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminSession } from '@/lib/auth'
import { invalidatePlatformSettingsCache } from '@/lib/cache-invalidation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


const updatePlatformSettingsSchema = z.object({
  footerLogoR2Key: z.string().optional().nullable(),
  footerLogoR2Url: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await prisma.platformSettings.findUnique({
      where: { id: 'platform-1' },
    })

    // Create default if doesn't exist
    if (!settings) {
      try {
        settings = await prisma.platformSettings.create({
          data: {
            id: 'platform-1',
          },
        })
      } catch (createError: any) {
        // If create fails (e.g., table doesn't exist), return empty settings
        console.error('Error creating platform settings:', createError)
        return NextResponse.json({
          id: 'platform-1',
          footerLogoR2Key: null,
          footerLogoR2Url: null,
        })
      }
    }

    return NextResponse.json({
      id: settings.id,
      footerLogoR2Key: settings.footerLogoR2Key,
      footerLogoR2Url: settings.footerLogoR2Url,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Error fetching platform settings:', error)
    // Return empty settings instead of error to prevent UI breakage
    return NextResponse.json({
      id: 'platform-1',
      footerLogoR2Key: null,
      footerLogoR2Url: null,
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[PLATFORM SETTINGS PUT] Request body:', JSON.stringify(body, null, 2))
    
    const validation = updatePlatformSettingsSchema.safeParse(body)

    if (!validation.success) {
      console.error('[PLATFORM SETTINGS PUT] Validation failed:', validation.error)
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Prepare update data - map camelCase input to Prisma model fields
    // Prisma will automatically map these to snake_case columns via @map directives
    const updateData: {
      footerLogoR2Key: string | null
      footerLogoR2Url: string | null
    } = {
      footerLogoR2Key: validation.data.footerLogoR2Key ?? null,
      footerLogoR2Url: validation.data.footerLogoR2Url ?? null,
    }

    console.log('[PLATFORM SETTINGS PUT] Update data (camelCase for Prisma):', JSON.stringify(updateData, null, 2))
    console.log('[PLATFORM SETTINGS PUT] Prisma model: PlatformSettings')
    console.log('[PLATFORM SETTINGS PUT] Mapped table: platform_settings (via @@map("platform_settings"))')
    console.log('[PLATFORM SETTINGS PUT] Mapped fields: footerLogoR2Key -> footer_logo_r2_key, footerLogoR2Url -> footer_logo_r2_url')

    // Use upsert to ensure settings exist (singleton pattern: id='platform-1')
    // Prisma model: PlatformSettings (camelCase)
    // Database table: platform_settings (snake_case, via @@map)
    // Prisma fields (camelCase) -> DB columns (snake_case, via @map)
    const updated = await prisma.platformSettings.upsert({
      where: { id: 'platform-1' },
      update: updateData,
      create: {
        id: 'platform-1',
        footerLogoR2Key: validation.data.footerLogoR2Key ?? null,
        footerLogoR2Url: validation.data.footerLogoR2Url ?? null,
      },
    })

    console.log('[PLATFORM SETTINGS PUT] Upsert successful:', {
      id: updated.id,
      footerLogoR2Key: updated.footerLogoR2Key,
      footerLogoR2Url: updated.footerLogoR2Url,
    })

    invalidatePlatformSettingsCache()

    return NextResponse.json({
      ok: true,
      platformSettings: {
        id: updated.id,
        footerLogoR2Key: updated.footerLogoR2Key,
        footerLogoR2Url: updated.footerLogoR2Url,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error: any) {
    // Log the FULL error object including all Prisma/Supabase details
    console.error('[PLATFORM SETTINGS PUT] Error updating platform settings:')
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error meta (Prisma):', JSON.stringify(error?.meta, null, 2))
    console.error('Error stack:', error?.stack)
    console.error('Error name:', error?.name)
    console.error('Error cause:', error?.cause)
    
    // Check for specific Prisma error codes
    if (error?.code === 'P2021') {
      console.error('[PLATFORM SETTINGS PUT] P2021: Table or column does not exist')
      console.error('[PLATFORM SETTINGS PUT] Expected: table "platform_settings" with columns: id, footer_logo_r2_key, footer_logo_r2_url, created_at, updated_at')
      return NextResponse.json({ 
        error: 'Database table or column does not exist. Please run database migrations.',
        code: error?.code,
        details: error?.meta,
        expected: {
          table: 'platform_settings',
          columns: ['id', 'footer_logo_r2_key', 'footer_logo_r2_url', 'created_at', 'updated_at'],
          where: { id: 'platform-1' }
        }
      }, { status: 500 })
    }
    
    if (error?.code === 'P2025') {
      console.error('[PLATFORM SETTINGS PUT] P2025: Record not found (should not happen with upsert)')
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred',
      code: error?.code || 'UNKNOWN',
      details: error?.meta || {}
    }, { status: 500 })
  }
}

