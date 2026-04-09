import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET — geeft lijst van user_ids met actieve push subscriptions (alleen voor beheerder)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    // Alleen beheerder
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data } = await admin.from('push_subscriptions').select('user_id')

    return NextResponse.json({ userIds: (data ?? []).map((r) => r.user_id) })
  } catch (err) {
    console.error('[notifications/users] error:', err)
    return NextResponse.json({ userIds: [] })
  }
}
