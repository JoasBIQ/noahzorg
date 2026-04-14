import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const attachmentId = searchParams.get('attachmentId')
    const filename = searchParams.get('filename') ?? 'bijlage'
    const mimeType = searchParams.get('mimeType') ?? 'application/octet-stream'

    if (!messageId || !attachmentId) {
      return NextResponse.json({ error: 'messageId en attachmentId zijn verplicht.' }, { status: 400 })
    }

    const client = await getAuthorizedClient()
    if (!client) return NextResponse.json({ error: 'Gmail niet gekoppeld.' }, { status: 401 })

    const gmail = google.gmail({ version: 'v1', auth: client })

    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    })

    const data = res.data.data
    if (!data) return NextResponse.json({ error: 'Bijlage niet gevonden.' }, { status: 404 })

    // Gmail gebruikt base64url (- i.p.v. +, _ i.p.v. /)
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
    const buffer = Buffer.from(base64, 'base64')

    // Stel juiste Content-Disposition in: inline voor afbeeldingen zodat de browser ze kan tonen
    const isImage = mimeType.startsWith('image/')
    const disposition = isImage
      ? `inline; filename="${encodeURIComponent(filename)}"`
      : `attachment; filename="${encodeURIComponent(filename)}"`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': disposition,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    console.error('[gmail/attachment] Fout:', error)
    return NextResponse.json({ error: 'Bijlage ophalen mislukt.' }, { status: 500 })
  }
}
