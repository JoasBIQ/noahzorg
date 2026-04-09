import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST — sla een push subscription op voor de ingelogde gebruiker
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const subscription = await request.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Ongeldige subscription.' }, { status: 400 })
    }

    const admin = createAdminClient()
    await admin
      .from('push_subscriptions')
      .upsert({ user_id: user.id, subscription }, { onConflict: 'user_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[subscribe] error:', err)
    return NextResponse.json({ error: 'Opslaan mislukt.' }, { status: 500 })
  }
}

// DELETE — verwijder de push subscription van de ingelogde gebruiker
export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const admin = createAdminClient()
    await admin.from('push_subscriptions').delete().eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[subscribe] delete error:', err)
    return NextResponse.json({ error: 'Verwijderen mislukt.' }, { status: 500 })
  }
}

// GET — controleer of de ingelogde gebruiker een actieve subscription heeft
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ actief: false })

    const admin = createAdminClient()
    const { data } = await admin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ actief: !!data })
  } catch {
    return NextResponse.json({ actief: false })
  }
}
