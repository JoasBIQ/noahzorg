import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
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

    const body = await request.json().catch(() => ({}))
    const { parentId } = body as { parentId?: string }

    const authClient = await getAuthorizedClient()
    if (!authClient) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }

    const drive = google.drive({ version: 'v3', auth: authClient })

    // Haal originele bestandsnaam op
    const original = await drive.files.get({
      fileId: params.fileId,
      fields: 'name,parents',
    })

    const copyMeta: { name: string; parents?: string[] } = {
      name: `Kopie van ${original.data.name ?? 'bestand'}`,
    }
    if (parentId) {
      copyMeta.parents = [parentId]
    } else if (original.data.parents?.length) {
      copyMeta.parents = [original.data.parents[0]]
    }

    const res = await drive.files.copy({
      fileId: params.fileId,
      requestBody: copyMeta,
      fields:
        'id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents,thumbnailLink',
    })

    return NextResponse.json({ file: res.data })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }
    console.error('[Drive Copy]', error)
    return NextResponse.json({ error: 'Kopiëren mislukt.' }, { status: 500 })
  }
}
