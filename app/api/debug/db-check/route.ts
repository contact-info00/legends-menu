export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEBUG_KEY = process.env.DEBUG_KEY || 'debug-2026'

export async function GET(request: NextRequest) {
  try {
    // Check for debug key in header or query param
    const headerKey = request.headers.get('X-Debug-Key') || request.headers.get('debug-key')
    const queryKey = request.nextUrl.searchParams.get('key')
    
    if (headerKey !== DEBUG_KEY && queryKey !== DEBUG_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide X-Debug-Key header or ?key= query param.' },
        { status: 401 }
      )
    }

    // Run database diagnostic queries
    const checks: Record<string, any> = {}

    // Check 1: Database connection and basic info
    try {
      const dbInfo = await prisma.$queryRaw<Array<{
        exists: string | null
        db: string
        schema: string
      }>>`
        SELECT 
          to_regclass('public.platform_settings')::text as exists,
          current_database() as db,
          current_schema() as schema
      `
      checks.databaseInfo = dbInfo[0]
    } catch (error: any) {
      checks.databaseInfo = { error: error.message, code: error.code }
    }

    // Check 2: List all tables in public schema
    try {
      const tables = await prisma.$queryRaw<Array<{
        table_name: string
      }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%platform%'
        ORDER BY table_name
      `
      checks.tablesMatchingPlatform = tables.map(t => t.table_name)
    } catch (error: any) {
      checks.tablesMatchingPlatform = { error: error.message, code: error.code }
    }

    // Check 3: Check platform_settings columns if table exists
    try {
      const columns = await prisma.$queryRaw<Array<{
        column_name: string
        data_type: string
        is_nullable: string
      }>>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'platform_settings'
        ORDER BY ordinal_position
      `
      checks.platformSettingsColumns = columns.length > 0 ? columns : 'Table does not exist or has no columns'
    } catch (error: any) {
      checks.platformSettingsColumns = { error: error.message, code: error.code }
    }

    // Check 4: Try to query the table using Prisma
    try {
      const prismaTest = await prisma.platformSettings.findUnique({
        where: { id: 'platform-1' },
      })
      checks.prismaQuery = prismaTest ? 'SUCCESS: Found row' : 'SUCCESS: Table exists but row not found'
    } catch (error: any) {
      checks.prismaQuery = {
        error: error.message,
        code: error.code,
        meta: error.meta,
      }
    }

    // Check 5: Environment variables (sanitized)
    checks.env = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...' || 'NOT SET',
      hasDirectUrl: !!process.env.DIRECT_URL,
      directUrlPrefix: process.env.DIRECT_URL?.substring(0, 30) + '...' || 'NOT SET',
      nodeEnv: process.env.NODE_ENV,
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checks,
      diagnostic: {
        message: checks.platformSettingsColumns === 'Table does not exist or has no columns' 
          ? '❌ Table platform_settings does not exist in public schema'
          : checks.prismaQuery?.error
          ? '❌ Prisma query failed: ' + checks.prismaQuery.error
          : '✅ Database connection and table structure look correct'
      }
    })
  } catch (error: any) {
    console.error('[DEBUG DB CHECK] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      stack: error.stack,
    }, { status: 500 })
  }
}

