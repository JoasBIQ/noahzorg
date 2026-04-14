import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { ExportPage } from '@/components/export/export-page'

export default async function ExportRoute() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <AppShell>
      <ExportPage />
    </AppShell>
  )
}
