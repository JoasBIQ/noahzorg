import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { aan, onderwerp, bericht, cc, inReplyTo, references, threadId } = await request.json()

    if (!aan || !bericht) {
      return NextResponse.json({ error: 'Ontvanger en bericht zijn verplicht.' }, { status: 400 })
    }

    const client = await getAuthorizedClient()
    if (!client) {
      return NextResponse.json({ error: 'Gmail is niet gekoppeld.' }, { status: 400 })
    }

    const gmail = google.gmail({ version: 'v1', auth: client })

    // Haal het verzendadres op
    const profileRes = await gmail.users.getProfile({ userId: 'me' })
    const fromEmail = profileRes.data.emailAddress ?? 'me'

    // Stel RFC 2822 e-mailbericht op
    const headers: string[] = [
      `From: ${fromEmail}`,
      `To: ${aan}`,
      `Subject: =?UTF-8?B?${Buffer.from(onderwerp ?? '').toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ]

    if (cc) headers.push(`Cc: ${cc}`)
    if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`)
    if (references) headers.push(`References: ${references}`)

    const body = Buffer.from(bericht, 'utf-8').toString('base64')
    const rawEmail = [...headers, '', body].join('\r\n')

    // Gmail API vereist URL-safe base64 (geen +/=)
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        // threadId zorgt dat Gmail de reply aan de juiste thread koppelt
        ...(threadId ? { threadId } : {}),
      },
    })

    // Notificeer andere gebruikers dat er een mail verstuurd is
    sendPushToAll({
      title: `Mail verstuurd naar ${aan}`,
      body: onderwerp ?? '(geen onderwerp)',
      url: '/mail',
      tag: 'mail-verstuurd',
    }, user.id).catch((err) => console.error('[gmail/send] push notificatie fout:', err))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    console.error('[Gmail send] Error:', error)
    return NextResponse.json({ error: 'Verzenden mislukt. Probeer het opnieuw.' }, { status: 500 })
  }
}
