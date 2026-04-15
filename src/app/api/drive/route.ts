import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size: string | null
  webViewLink: string | null
  iconLink: string | null
  parents: string[] | null
  thumbnailLink: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? null

    // Resolve folderId: use query param, fallback to app_instellingen
    let folderId = searchParams.get('folderId') ?? null
    if (!folderId && !search) {
      const { data: setting } = await supabase
        .from('app_instellingen')
        .select('value')
        .eq('key', 'drive_root_folder_id')
        .single()
      folderId = (setting?.value as string) ?? null
    }

    const authClient = await getAuthorizedClient()
    if (!authClient) {
      return NextResponse.json({ error: 'not_connected', files: [], folder: null })
    }

    const drive = google.drive({ version: 'v3', auth: authClient })

    // Build query
    let q = 'trashed = false'
    if (search) {
      const escaped = search.replace(/'/g, "\\'")
      q += ` and name contains '${escaped}'`
    } else if (folderId) {
      q += ` and '${folderId}' in parents`
    }

    const listRes = await drive.files.list({
      q,
      fields:
        'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents,thumbnailLink)',
      orderBy: 'folder,name',
      pageSize: 200,
    })

    const files: GoogleDriveFile[] = (listRes.data.files ?? []).map((f) => ({
      id: f.id ?? '',
      name: f.name ?? '',
      mimeType: f.mimeType ?? '',
      modifiedTime: f.modifiedTime ?? '',
      size: f.size ?? null,
      webViewLink: f.webViewLink ?? null,
      iconLink: f.iconLink ?? null,
      parents: f.parents ?? null,
      thumbnailLink: f.thumbnailLink ?? null,
    }))

    // Fetch folder name if we're inside a specific folder
    let folder: { id: string; name: string } | null = null
    if (folderId) {
      try {
        const folderRes = await drive.files.get({
          fileId: folderId,
          fields: 'id,name',
        })
        folder = {
          id: folderRes.data.id ?? folderId,
          name: folderRes.data.name ?? folderId,
        }
      } catch {
        folder = { id: folderId, name: folderId }
      }
    }

    return NextResponse.json({ files, folder })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'not_connected', files: [], folder: null })
    }
    console.error('[Drive API] Error:', error)
    return NextResponse.json(
      { error: 'Drive ophalen mislukt.', files: [], folder: null },
      { status: 500 }
    )
  }
}
