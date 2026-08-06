import { PrismaClient } from '@prisma/client'

const globalForSchema = globalThis as unknown as {
  schemaInitPromise?: Promise<void>
}

function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build'
  )
}

async function runSchemaInitialization(prisma: PrismaClient): Promise<void> {
  const started = Date.now()
  console.log('[DB INIT] Starting runtime schema compatibility DDL')

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "welcomeBgMimeType" TEXT;'
    )
  } catch (error) {
    console.warn('[DB INIT] Failed to ensure welcomeBgMimeType column:', error)
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT;'
    )
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "snapchatUrl" TEXT;'
    )
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "tiktokUrl" TEXT;'
    )
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "service_charge_percent" DOUBLE PRECISION DEFAULT 0;'
    )
  } catch (error) {
    console.warn('[DB INIT] Failed to ensure Restaurant social media columns:', error)
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "header_footer_bg_color" TEXT;'
    )
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "glass_tint_color" TEXT;'
    )
  } catch (error) {
    console.warn('[DB INIT] Failed to ensure Theme columns:', error)
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "UiSettings" ADD COLUMN IF NOT EXISTS "bottomNavCategorySize" INTEGER NOT NULL DEFAULT 13;'
    )
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "UiSettings" ADD COLUMN IF NOT EXISTS "bottomNavSectionSize" INTEGER NOT NULL DEFAULT 13;'
    )
  } catch (error) {
    console.warn('[DB INIT] Failed to ensure UiSettings bottom nav columns:', error)
  }

  console.log(`[DB INIT] Schema compatibility DDL finished in ${Date.now() - started}ms`)
}

/**
 * Runs idempotent schema compatibility DDL once per server process.
 * Called from lib/prisma.ts at startup — never from request handlers.
 */
export function initializeSchemaOnce(prisma: PrismaClient): Promise<void> {
  if (globalForSchema.schemaInitPromise) {
    return globalForSchema.schemaInitPromise
  }

  // Production deploys use Prisma migrations; runtime DDL on serverless cold starts
  // blocks the single pooled connection and causes SSR timeouts (HTTP 500).
  if (isBuildTime() || !process.env.DATABASE_URL || process.env.VERCEL === '1') {
    if (process.env.VERCEL === '1') {
      console.log('[DB INIT] Skipping runtime DDL on Vercel (migrations are source of truth)')
    }
    globalForSchema.schemaInitPromise = Promise.resolve()
    return globalForSchema.schemaInitPromise
  }

  globalForSchema.schemaInitPromise = runSchemaInitialization(prisma).catch((error) => {
    console.error('[DB INIT] Schema initialization failed:', error)
  })

  return globalForSchema.schemaInitPromise
}
