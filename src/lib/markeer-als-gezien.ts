'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Markeer een of meerdere items als gezien voor de opgegeven gebruiker.
 * Doet een upsert op de user_gezien tabel (UNIQUE user_id, item_type, item_id).
 */
export async function markeerAlsGezien(
  userId: string,
  itemType: 'notitie' | 'overleg',
  itemIds: string[]
): Promise<void> {
  if (!userId || !itemIds.length) return

  const supabase = createClient()
  const gezien_at = new Date().toISOString()

  const records = itemIds.map((id) => ({
    user_id: userId,
    item_type: itemType,
    item_id: id,
    gezien_at,
  }))

  await (supabase as ReturnType<typeof createClient>)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('user_gezien' as any)
    .upsert(records, { onConflict: 'user_id,item_type,item_id' })
}
