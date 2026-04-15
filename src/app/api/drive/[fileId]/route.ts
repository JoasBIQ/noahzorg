import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

type Params = { params: { fileId: string } }

// PATCH: hernoemen of verplaatsen
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    // Alleen beheerder mag hernoemen/verplaatsen
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!profile || profile.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, parentId, removeParentId } = body as {
      name?: string
      parentId?: string
      removeParentId?: string
    }

    const authClient = await getAuthorizedClient()
    if (!authClient) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }

    const drive = google.drive({ version: 'v3', auth: authClient })

    const res = await drive.files.update({
      fileId: params.fileId,
      requestBody: { ...(name ? { name } : {}) },
      ...(parentId ? { addParents: parentId } : {}),
      ...(removeParentId ? { removeParents: removeParentId } : {}),
      fields:
        'id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents,thumbnailLink',
    })
    return NextResponse.json({ file: res.data })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }
    console.error('[Drive PATCH]', error)
    return NextResponse.json({ error: 'Bewerken mislukt.' }, { status: 500 })
  }
}

// DELETE: naar prullenbak
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    // Alleen beheerder mag verwijderen
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!profile || profile.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
    }

    const authClient = await getAuthorizedClient()
    if (!authClient) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }

    const drive = google.drive({ version: 'v3', auth: authClient })

    await drive.files.update({
      fileId: params.fileId,
      requestBody: { trashed: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'not_connected' }, { status: 503 })
    }
    console.error('[Drive DELETE]', error)
    return NextResponse.json({ error: 'Verwijderen mislukt.' }, { status: 500 })
  }
}
