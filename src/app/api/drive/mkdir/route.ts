import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
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

    // Alleen beheerder
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!profile || profile.rol !== 'beheerder') {
      return NextResponse.json(
        { error: 'Alleen beheerders mogen mappen aanmaken.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, parentId } = body as { name: string; parentId: string }

    if (!name || !parentId) {
      return NextResponse.json(
        { error: 'name en parentId zijn verplicht.' },
        { status: 400 }
      )
    }

    const authClient = await getAuthorizedClient()
    if (!authClient) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }

    const drive = google.drive({ version: 'v3', auth: authClient })

    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id,name,mimeType,modifiedTime,webViewLink,parents',
    })

    return NextResponse.json({ folder: res.data })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }
    console.error('[Drive mkdir] Error:', error)
    return NextResponse.json({ error: 'Map aanmaken mislukt.' }, { status: 500 })
  }
}
