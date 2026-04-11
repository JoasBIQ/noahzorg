import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const VAPID_SUBJECT = process.env.VAPID_SUBJECT
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY

if (!VAPID_SUBJECT || !VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('[push] VAPID keys ontbreken:', {
    VAPID_SUBJECT: !!VAPID_SUBJECT,
    VAPID_PUBLIC: !!VAPID_PUBLIC,
    VAPID_PRIVATE: !!VAPID_PRIVATE,
  })
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  console.log('[push] VAPID keys geladen, subject:', VAPID_SUBJECT)
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag?: string
}

/**
 * HTTP-statuscodes die aangeven dat een subscription definitief ongeldig is.
 * 410 = Gone (standaard), 404 = Not Found (sommige push-services), 401 = Unauthorized
 * (kan duiden op VAPID-mismatch of verlopen subscription-authenticatie).
 */
function isDeadSubscription(statusCode: number | undefined): boolean {
  return statusCode === 410 || statusCode === 404 || statusCode === 401
}

/**
 * Stuur een push notificatie naar één specifieke gebruiker.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  console.log('[push] sendPushToUser:', userId, payload.title)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[push] DB fout bij ophalen subscription:', error)
    return false
  }
  if (!data?.subscription) {
    console.log('[push] Geen subscription gevonden voor user:', userId)
    return false
  }

  console.log('[push] Subscription gevonden, versturen...')
  try {
    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    )
    console.log('[push] Notificatie verstuurd naar user:', userId)
    return true
  } catch (err: unknown) {
    const code = (err as { statusCode?: number }).statusCode
    console.error('[push] sendPushToUser fout (statusCode=' + code + '):', err)
    if (isDeadSubscription(code)) {
      console.log('[push] Subscription ongeldig (' + code + '), opruimen voor user:', userId)
      await admin.from('push_subscriptions').delete().eq('user_id', userId)
    }
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
  console.log('[push] sendPushToAll:', payload.title, excludeUserId ? `(excl. ${excludeUserId})` : '(iedereen)')
  const admin = createAdminClient()

  // Haal ALLE subscriptions op om het totale aantal te kunnen loggen
  const { data: allSubs, error: countError } = await admin
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (countError) {
    console.error('[push] DB fout bij ophalen subscriptions:', countError)
    return
  }

  const total = allSubs?.length ?? 0
  const subs = excludeUserId
    ? (allSubs ?? []).filter((r) => r.user_id !== excludeUserId)
    : (allSubs ?? [])

  console.log(`[push] Subscriptions: ${total} totaal, ${subs.length} na exclusie`)

  if (!subs.length) {
    if (total > 0 && excludeUserId) {
      console.log('[push] Alle subscribers zijn uitgesloten (verzender is de enige subscriber)')
    } else {
      console.log('[push] Geen actieve subscriptions gevonden')
    }
    return
  }

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          JSON.stringify(payload)
        )
        console.log('[push] Verstuurd naar user:', row.user_id)
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode
        console.error('[push] Fout voor user', row.user_id, '(statusCode=' + code + '):', err)
        if (isDeadSubscription(code)) {
          console.log('[push] Subscription ongeldig (' + code + '), opruimen voor user:', row.user_id)
          await admin.from('push_subscriptions').delete().eq('user_id', row.user_id)
        }
      }
    })
  )

  console.log('[push] sendPushToAll klaar')
}
