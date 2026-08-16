export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { findOwnedItem, loadAdvancedOptionsForItem } from '@/lib/advanced-options-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()
    const item = await findOwnedItem(params.id, session.restaurantId)

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const data = await loadAdvancedOptionsForItem(item.id, false)
    return NextResponse.json({
      itemId: item.id,
      itemNameEn: item.nameEn,
      ...data,
    })
  } catch (error) {
    console.error('Error loading advanced options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
