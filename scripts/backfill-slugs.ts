import { PrismaClient } from '@prisma/client'

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

async function backfillSlugs() {
  console.log('🔧 Backfilling slugs for all restaurants...')

  try {
    // Get all restaurants
    const allRestaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        nameEn: true,
        slug: true,
      },
    })

    console.log(`Found ${allRestaurants.length} restaurant(s)`)

    for (const restaurant of allRestaurants) {
      // Generate slug from English name
      const expectedSlug = generateSlug(restaurant.nameEn || 'restaurant')

      // Check if slug needs updating
      if (!restaurant.slug || restaurant.slug !== expectedSlug) {
        console.log(`\n📝 Restaurant: "${restaurant.nameEn}"`)
        console.log(`   Current slug: ${restaurant.slug || '(missing)'}`)
        console.log(`   Expected slug: ${expectedSlug}`)

        // Check if the expected slug already exists for another restaurant
        const existing = await prisma.restaurant.findUnique({
          where: { slug: expectedSlug },
        })

        let finalSlug = expectedSlug
        if (existing && existing.id !== restaurant.id) {
          // If slug exists for another restaurant, append restaurant ID to make it unique
          finalSlug = `${expectedSlug}-${restaurant.id.slice(-6)}`
          console.log(`   ⚠️  Slug conflict! Using: ${finalSlug}`)
        }

        // Update restaurant with slug
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: { slug: finalSlug },
        })

        console.log(`   ✅ Updated slug to: ${finalSlug}`)
      } else {
        console.log(`✓ Restaurant "${restaurant.nameEn}" already has correct slug: ${restaurant.slug}`)
      }
    }

    console.log('\n🎉 Slug backfill completed!')
    
    // Verify all restaurants have slugs (slug is required, so this is just a sanity check)
    const allRestaurantsFinal = await prisma.restaurant.findMany({
      select: {
        id: true,
        nameEn: true,
        slug: true,
      },
    })

    const restaurantsWithSlugs = allRestaurantsFinal.filter(r => r.slug && r.slug.length > 0)
    console.log(`✅ Verified: ${restaurantsWithSlugs.length}/${allRestaurantsFinal.length} restaurant(s) have slugs`)
    
    // List all restaurants and their slugs for verification
    console.log('\n📋 Restaurant slugs:')
    for (const r of allRestaurantsFinal) {
      console.log(`   - "${r.nameEn}" → ${r.slug}`)
    }
  } catch (error: any) {
    console.error('❌ Error backfilling slugs:', error)
    if (error.code === 'P2002') {
      console.error('   Unique constraint violation - slug conflict detected')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfillSlugs()

