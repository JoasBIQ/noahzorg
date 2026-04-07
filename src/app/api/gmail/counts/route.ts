import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ unread: 0, drafts: 0 })
    }

    const client = await getAuthorizedClient()
    if (!client) {
      return NextResponse.json({ unread: 0, drafts: 0 })
    }

    const gmail = google.gmail({ version: 'v1', auth: client })

    // Haal inbox message-IDs op (max 100) + concept-count via labels API
    const [inboxList, draftLabel] = await Promise.all([
      gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 100,
      }),
      gmail.users.labels.get({ userId: 'me', id: 'DRAFT' }),
    ])

    const inboxIds = (inboxList.data.messages ?? []).map((m) => m.id!)

    // Tel hoeveel van deze inbox-berichten de gebruiker al heeft gelezen
    let unreadForUser = 0
    if (inboxIds.length > 0) {
      const { count: readCount } = await supabase
        .from('mail_leestatus')
        .select('*', { count: 'exact', head: true })
        .eq('gebruiker_id', user.id)
        .in('gmail_message_id', inboxIds)

      unreadForUser = inboxIds.length - (readCount ?? 0)
    }

    // Tel ongelezen overleg-reacties van anderen
    const [{ data: alleReacties }, { data: gelezenReacties }] = await Promise.all([
      supabase.from('mail_reacties').select('id').neq('auteur_id', user.id),
      supabase.from('mail_reacties_leestatus').select('mail_reactie_id').eq('gebruiker_id', user.id),
    ])
    const gelezenSet = new Set(gelezenReacties?.map((g) => g.mail_reactie_id) ?? [])
    const overleg = (alleReacties ?? []).filter((r) => !gelezenSet.has(r.id)).length

    return NextResponse.json({
      unread: Math.max(0, unreadForUser),
      drafts: draftLabel.data.messagesTotal ?? 0,
      overleg,
    })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ unread: 0, drafts: 0, overleg: 0, token_expired: true })
    }
    return NextResponse.json({ unread: 0, drafts: 0, overleg: 0 })
  }
}
