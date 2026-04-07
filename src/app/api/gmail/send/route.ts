import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { aan, onderwerp, bericht } = await request.json()

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
    const fromHeader = `From: ${fromEmail}`
    const toHeader = `To: ${aan}`
    const subjectHeader = `Subject: =?UTF-8?B?${Buffer.from(onderwerp ?? '').toString('base64')}?=`
    const mimeHeader = 'MIME-Version: 1.0'
    const contentType = 'Content-Type: text/plain; charset=UTF-8'
    const contentTransfer = 'Content-Transfer-Encoding: base64'
    const body = Buffer.from(bericht, 'utf-8').toString('base64')

    const rawEmail = [
      fromHeader,
      toHeader,
      subjectHeader,
      mimeHeader,
      contentType,
      contentTransfer,
      '',
      body,
    ].join('\r\n')

    // Gmail API vereist URL-safe base64 (geen padding +/=)
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedEmail },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    console.error('[Gmail send] Error:', error)
    return NextResponse.json({ error: 'Verzenden mislukt. Probeer het opnieuw.' }, { status: 500 })
  }
}
