import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

// Mappenstructuur definitie
// key: sleutelwoord voor app_instellingen (null = geen eigen key, alleen voor tussenliggende mappen)
const FOLDER_TREE = [
  {
    name: "Rondom Noah",
    key: 'drive_root_folder_id',
    children: [
      {
        name: 'Medisch',
        key: null,
        children: [
          { name: 'Medicatielijst',      key: 'drive_map_medicatielijst', children: [] },
          { name: 'Brieven en verslagen', key: 'drive_map_brieven',        children: [] },
          { name: 'Recepten',            key: 'drive_map_recepten',        children: [] },
          { name: 'Indicaties',          key: 'drive_map_indicaties',      children: [] },
        ],
      },
      {
        name: 'Juridisch',
        key: 'drive_map_juridisch',
        children: [
          { name: 'Mentorschap en bewindvoering', key: null, children: [] },
        ],
      },
      {
        name: 'Financieel',
        key: 'drive_map_financieel',
        children: [
          { name: 'Wajong en PGB', key: null, children: [] },
        ],
      },
      { name: 'Wonen',        key: 'drive_map_wonen',       children: [] },
      { name: 'Dagbesteding', key: 'drive_map_dagbesteding', children: [] },
      {
        name: 'Familieoverleg',
        key: 'drive_map_familieoverleg',
        children: [
          { name: 'Verslagen',                key: 'drive_map_verslagen',                children: [] },
          { name: 'Opnames',                  key: 'drive_map_opnames',                  children: [] },
          { name: 'Externe overlegverslagen', key: 'drive_map_externe_overlegverslagen', children: [] },
        ],
      },
    ],
  },
] as const

type FolderResult = {
  name: string
  id: string
  key: string | null
  status: 'aangemaakt' | 'bestaand'
}

// Zoek bestaande map op naam + parent, of maak hem aan
async function findOrCreate(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string,
): Promise<{ id: string; status: 'aangemaakt' | 'bestaand' }> {
  const escapedName = name.replace(/'/g, "\\'")
  let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`
  if (parentId) {
    q += ` and '${parentId}' in parents`
  }

  const listRes = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 })
  const existing = listRes.data.files?.[0]
  if (existing?.id) {
    return { id: existing.id, status: 'bestaand' }
  }

  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: 'id',
  })
  return { id: createRes.data.id!, status: 'aangemaakt' }
}

// Sla een key op in app_instellingen (upsert)
async function saveSetting(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  key: string,
  value: string,
) {
  const { data: existing } = await adminClient
    .from('app_instellingen')
    .select('id')
    .eq('key', key)
    .single()

  if (existing) {
    await adminClient
      .from('app_instellingen')
      .update({ value, updated_by: userId })
      .eq('key', key)
  } else {
    await adminClient
      .from('app_instellingen')
      .insert({ key, value, updated_by: userId })
  }
}

// Verwerk een node recursief
async function processNode(
  drive: ReturnType<typeof google.drive>,
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  node: { name: string; key: string | null; children: readonly unknown[] },
  parentId?: string,
  results: FolderResult[] = [],
): Promise<string> {
  const { id, status } = await findOrCreate(drive, node.name, parentId)

  results.push({ name: node.name, id, key: node.key, status })

  if (node.key) {
    await saveSetting(adminClient, userId, node.key, id)
  }

  for (const child of node.children as typeof node[]) {
    await processNode(drive, adminClient, userId, child, id, results)
  }

  return id
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    // Controleer of gebruiker beheerder is
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()
    if (profile?.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Onvoldoende rechten.' }, { status: 403 })
    }

    // Haal Drive-client op via Gmail OAuth tokens (met automatische token refresh)
    const oauth2Client = await getAuthorizedClient()
    if (!oauth2Client) {
      return NextResponse.json({ error: 'Gmail niet gekoppeld. Koppel eerst Gmail om Drive te gebruiken.' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // Verwerk de volledige mappenstructuur
    const results: FolderResult[] = []
    for (const rootNode of FOLDER_TREE) {
      await processNode(drive, adminClient, user.id, rootNode, undefined, results)
    }

    return NextResponse.json({
      success: true,
      folders: results,
      aangemaakt: results.filter((r) => r.status === 'aangemaakt').length,
      bestaand: results.filter((r) => r.status === 'bestaand').length,
    })
  } catch (err) {
    if (err instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'Gmail koppeling verlopen. Koppel opnieuw via Beheer.' }, { status: 401 })
    }
    console.error('[Drive setup-folders] Error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Mappen aanmaken mislukt: ${message}` }, { status: 500 })
  }
}
