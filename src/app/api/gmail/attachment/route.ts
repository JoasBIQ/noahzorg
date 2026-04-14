import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'
import { google } from 'googleapis'
import type { gmail_v1 } from 'googleapis'

export const dynamic = 'force-dynamic'

/** Zoek recursief een part met de gegeven bestandsnaam en retourneer de base64url-data */
function findInlinePartData(
  part: gmail_v1.Schema$MessagePart | null | undefined,
  targetFilename: string,
  targetMimeType: string
): string | null {
  if (!part) return null
  if (
    part.filename === targetFilename &&
    part.mimeType === targetMimeType &&
    part.body?.data
  ) {
    return part.body.data
  }
  for (const child of part.parts ?? []) {
    const found = findInlinePartData(child, targetFilename, targetMimeType)
    if (found) return found
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const attachmentId = searchParams.get('attachmentId') ?? ''
    const filename = searchParams.get('filename') ?? 'bijlage'
    const mimeType = searchParams.get('mimeType') ?? 'application/octet-stream'

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is verplicht.' }, { status: 400 })
    }

    const client = await getAuthorizedClient()
    if (!client) return NextResponse.json({ error: 'Gmail niet gekoppeld.' }, { status: 401 })

    const gmail = google.gmail({ version: 'v1', auth: client })

    let base64url: string

    if (attachmentId) {
      // Grote bijlage — opgeslagen als aparte resource in Gmail
      const res = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      })
      if (!res.data.data) {
        return NextResponse.json({ error: 'Bijlage niet gevonden.' }, { status: 404 })
      }
      base64url = res.data.data
    } else {
      // Kleine inline bijlage — data zit in de message payload zelf
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })
      const data = findInlinePartData(msg.data.payload, filename, mimeType)
      if (!data) {
        return NextResponse.json({ error: 'Inline bijlage niet gevonden.' }, { status: 404 })
      }
      base64url = data
    }

    // Gmail gebruikt base64url (- i.p.v. +, _ i.p.v. /)
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const buffer = Buffer.from(base64, 'base64')

    // Inline voor afbeeldingen zodat de browser ze direct kan tonen
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
