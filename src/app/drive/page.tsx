import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { DriveContent } from '@/components/drive/drive-content'
import type { Profile } from '@/types'

export default async function DrivePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Haal root folder ID op
  const { data: setting } = await supabase
    .from('app_instellingen')
    .select('value')
    .eq('key', 'drive_root_folder_id')
    .single()

  return (
    <AppShell>
      <DriveContent
        currentProfile={profile as unknown as Profile}
        rootFolderId={(setting?.value as string) ?? null}
      />
    </AppShell>
  )
}
