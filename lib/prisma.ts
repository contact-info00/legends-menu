import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Creates a PrismaClient instance with proper configuration.
 * 
 * IMPORTANT: For serverless environments (Vercel, etc.), ensure your DATABASE_URL
 * uses a connection pooler if available:
 * - Neon: Use the pooled connection string (ends with ?pgbouncer=true)
 * - Supabase: Use the connection pooler port (usually 6543)
 * - Other providers: Check their documentation for connection pooling options
 * 
 * Example pooled connection string:
 * postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=10
 */
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

/**
 * Prisma Client singleton - ensures only one instance exists across all serverless functions.
 * This prevents connection pool exhaustion in production environments.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Always set global in both dev and production to prevent multiple instances
// This is critical for serverless environments where each function invocation
// could otherwise create a new PrismaClient instance
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown (development only)
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}




