import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const formData = await request.formData()
    const parentId = formData.get('parentId') as string | null
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'Geen bestanden gevonden.' }, { status: 400 })
    }

    const authClient = await getAuthorizedClient()
    if (!authClient) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }

    const drive = google.drive({ version: 'v3', auth: authClient })
    const created = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const fileMetadata: { name: string; parents?: string[] } = {
        name: file.name,
      }
      if (parentId) fileMetadata.parents = [parentId]

      const res = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: file.type || 'application/octet-stream',
          body: Readable.from(buffer),
        },
        fields:
          'id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents,thumbnailLink',
      })

      created.push(res.data)
    }

    return NextResponse.json({ files: created })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }
    console.error('[Drive Upload]', error)
    return NextResponse.json({ error: 'Upload mislukt.' }, { status: 500 })
  }
}
