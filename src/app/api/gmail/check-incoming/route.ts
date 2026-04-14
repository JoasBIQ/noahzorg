/**
 * GET /api/gmail/check-incoming
 *
 * Controleert via de Gmail History API of er nieuwe berichten in de INBOX zijn
 * gekomen sinds de laatste check. Als dat zo is, worden push-notificaties
 * verstuurd naar alle gebruikers.
 *
 * Wordt aangeroepen door:
 * - Vercel cron job (elke minuut / elk uur, zie vercel.json)
 * - AppShell achtergrond-polling (elke 2 minuten als de app open is)
 *
 * Authenticatie:
 * - Via ?secret=CRON_SECRET query param (cron / server-to-server)
 * - Via Supabase sessie (browser-aanroep vanuit de app)
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ── Authenticatie ──────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Sta toe via cron-secret (server-aanroep) OF via geldige sessie (browser)
  const cronSecret = process.env.CRON_SECRET
  const isFromCron = cronSecret && secret === cronSecret

  if (!isFromCron) {
    // Controleer of er een geldige gebruikerssessie is
    try {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
    }
  }

  try {
    const adminClient = createAdminClient()

    // ── Haal Gmail token-rij op ────────────────────────────────────────
    const { data: tokenRow } = await adminClient
      .from('gmail_tokens')
      .select('id, last_history_id')
      .limit(1)
      .single()

    if (!tokenRow) {
      // Gmail niet gekoppeld
      return NextResponse.json({ nieuw: 0, reden: 'gmail_niet_gekoppeld' })
    }

    const client = await getAuthorizedClient()
    if (!client) {
      return NextResponse.json({ nieuw: 0, reden: 'geen_client' })
    }

    const gmail = google.gmail({ version: 'v1', auth: client })

    // ── Initialiseer historyId als die nog niet bekend is ──────────────
    if (!tokenRow.last_history_id) {
      const profile = await gmail.users.getProfile({ userId: 'me' })
      const currentHistoryId = profile.data.historyId

      if (currentHistoryId) {
        await adminClient
          .from('gmail_tokens')
          .update({ last_history_id: currentHistoryId })
          .eq('id', tokenRow.id)
      }

      console.log('[check-incoming] historyId geïnitialiseerd:', currentHistoryId)
      return NextResponse.json({ nieuw: 0, reden: 'geinitialiseerd' })
    }

    // ── Haal history op sinds de laatste check ─────────────────────────
    let historyResponse
    try {
      historyResponse = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: tokenRow.last_history_id,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX',
      })
    } catch (err: unknown) {
      // historyId verlopen (410 Gone) → reset en opnieuw initialiseren
      const googleErr = err as { code?: number }
      if (googleErr?.code === 410) {
        const profile = await gmail.users.getProfile({ userId: 'me' })
        const currentHistoryId = profile.data.historyId
        if (currentHistoryId) {
          await adminClient
            .from('gmail_tokens')
            .update({ last_history_id: currentHistoryId })
            .eq('id', tokenRow.id)
        }
        console.log('[check-incoming] historyId verlopen, opnieuw geïnitialiseerd')
        return NextResponse.json({ nieuw: 0, reden: 'history_verlopen_reset' })
      }
      throw err
    }

    const histories = historyResponse.data.history ?? []
    const newHistoryId = historyResponse.data.historyId

    // ── Verzamel unieke nieuwe INBOX-berichten ─────────────────────────
    const nieuweBerichten = new Map<string, { id: string; subject: string; from: string }>()

    for (const history of histories) {
      for (const added of history.messagesAdded ?? []) {
        const msg = added.message
        if (!msg?.id) continue

        // Alleen berichten in INBOX (geen Sent, Drafts, etc.)
        if (!msg.labelIds?.includes('INBOX')) continue

        if (!nieuweBerichten.has(msg.id)) {
          // Haal alleen headers op (goedkoop)
          try {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From'],
            })

            const headers = detail.data.payload?.headers ?? []
            const getHeader = (name: string) =>
              headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

            nieuweBerichten.set(msg.id, {
              id: msg.id,
              subject: getHeader('Subject') || '(geen onderwerp)',
              from: getHeader('From'),
            })
          } catch {
            // Bericht niet meer beschikbaar (bijv. verwijderd)
          }
        }
      }
    }

    // ── Werk historyId bij ─────────────────────────────────────────────
    if (newHistoryId && newHistoryId !== tokenRow.last_history_id) {
      await adminClient
        .from('gmail_tokens')
        .update({ last_history_id: newHistoryId })
        .eq('id', tokenRow.id)
    }

    const aantalNieuw = nieuweBerichten.size
    console.log(`[check-incoming] ${aantalNieuw} nieuw bericht(en) gevonden`)

    // ── Stuur push-notificaties voor elk nieuw bericht ─────────────────
    for (const bericht of Array.from(nieuweBerichten.values())) {
      // Haal afzendernaam op (bijv. "Jan de Vries <jan@example.com>" → "Jan de Vries")
      const afzenderNaam = bericht.from.replace(/<[^>]+>/, '').trim() || bericht.from

      await sendPushToAll({
        title: `📬 Nieuwe mail van ${afzenderNaam}`,
        body: bericht.subject,
        url: '/mail',
        tag: `mail-inkomend-${bericht.id}`,
      }).catch((err) =>
        console.error('[check-incoming] push fout:', err)
      )
    }

    return NextResponse.json({
      nieuw: aantalNieuw,
      berichten: Array.from(nieuweBerichten.values()).map((b) => ({
        subject: b.subject,
        from: b.from,
      })),
    })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ nieuw: 0, reden: 'token_verlopen' })
    }
    console.error('[check-incoming] Fout:', error)
    return NextResponse.json({ error: 'Controleren mislukt.' }, { status: 500 })
  }
}
