import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

// Google native bestanden exporteren naar Office/PDF formaat
const EXPORT_MIME_MAP: Record<string, { mimeType: string; ext: string }> = {
  'application/vnd.google-apps.document': {
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: '.docx',
  },
  'application/vnd.google-apps.spreadsheet': {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: '.xlsx',
  },
  'application/vnd.google-apps.presentation': {
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ext: '.pptx',
  },
  'application/vnd.google-apps.drawing': {
    mimeType: 'image/png',
    ext: '.png',
  },
  'application/vnd.google-apps.form': {
    mimeType: 'application/zip',
    ext: '.zip',
  },
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const authClient = await getAuthorizedClient()
    if (!authClient) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }

    const drive = google.drive({ version: 'v3', auth: authClient })

    // Bestandsmetadata ophalen
    const meta = await drive.files.get({
      fileId: params.fileId,
      fields: 'id,name,mimeType',
    })

    const mimeType = meta.data.mimeType ?? ''
    const name = meta.data.name ?? 'bestand'

    if (mimeType === 'application/vnd.google-apps.folder') {
      return NextResponse.json(
        { error: 'Mappen kunnen niet worden gedownload.' },
        { status: 400 }
      )
    }

    const accessToken = authClient.credentials.access_token
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Geen geldig toegangstoken.' },
        { status: 503 }
      )
    }

    const exportInfo = EXPORT_MIME_MAP[mimeType] ?? null
    let downloadUrl: string
    let downloadMimeType: string
    let fileName = name

    if (exportInfo) {
      // Google native bestand → exporteren
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${params.fileId}/export?mimeType=${encodeURIComponent(exportInfo.mimeType)}`
      downloadMimeType = exportInfo.mimeType
      if (!fileName.endsWith(exportInfo.ext)) fileName += exportInfo.ext
    } else {
      // Gewoon bestand → direct downloaden
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${params.fileId}?alt=media`
      downloadMimeType = mimeType || 'application/octet-stream'
    }

    const driveRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!driveRes.ok) {
      const text = await driveRes.text().catch(() => '')
      console.error('[Drive Download] Drive API error:', driveRes.status, text)
      return NextResponse.json({ error: 'Download mislukt.' }, { status: 502 })
    }

    // Stroom direct doorgeven aan de client
    return new NextResponse(driveRes.body, {
      headers: {
        'Content-Type': downloadMimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }
    console.error('[Drive Download]', error)
    return NextResponse.json({ error: 'Download mislukt.' }, { status: 500 })
  }
}
