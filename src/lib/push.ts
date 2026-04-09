import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  url: string
  tag?: string
}

/**
 * Stuur een push notificatie naar één specifieke gebruiker.
 * Geeft true terug als de notificatie verstuurd is, false als er geen subscription is.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data?.subscription) return false

  try {
    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    )
    return true
  } catch (err: unknown) {
    // 410 Gone = subscription is verlopen/verwijderd — opruimen
    if ((err as { statusCode?: number }).statusCode === 410) {
      await admin.from('push_subscriptions').delete().eq('user_id', userId)
    }
    console.error('[push] sendPushToUser error:', err)
    return false
  }
}

/**
 * Stuur een push notificatie naar alle gebruikers, optioneel met uitzondering van één.
 */
export async function sendPushToAll(
  payload: PushPayload,
  excludeUserId?: string
): Promise<void> {
  const admin = createAdminClient()
  let query = admin.from('push_subscriptions').select('user_id, subscription')
  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId)
  }
  const { data: subs } = await query

  if (!subs?.length) return

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('user_id', row.user_id)
        }
        console.error('[push] sendPushToAll error for', row.user_id, err)
      }
    })
  )
}
