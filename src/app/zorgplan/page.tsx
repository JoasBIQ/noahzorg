import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { ZorgplanContent } from '@/components/zorgplan/zorgplan-content'
import type { Profile } from '@/types'

export default async function ZorgplanPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <AppShell>
      <ZorgplanContent currentUserId={user.id} currentProfile={profile as unknown as Profile} />
    </AppShell>
  )
}
