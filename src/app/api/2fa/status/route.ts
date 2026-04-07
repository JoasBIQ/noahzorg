import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Haal TOTP-factoren op voor een specifieke gebruiker via de Supabase Admin REST API
async function getFactorsForUser(userId: string): Promise<{ id: string; status: string; created_at: string }[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/factors`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data.filter((f) => f.factor_type === 'totp') : []
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    // Alleen beheerder
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Geen rechten.' }, { status: 403 })
    }

    // Haal alle profielen op
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, naam, rol, kleur')
      .order('naam')

    if (!profiles) return NextResponse.json({ users: [] })

    // Haal per gebruiker de TOTP-factoren op
    const users = await Promise.all(
      profiles.map(async (p) => {
        const factors = await getFactorsForUser(p.id)
        const verifiedFactor = factors.find((f) => f.status === 'verified')
        return {
          id: p.id,
          naam: p.naam,
          rol: p.rol,
          kleur: p.kleur,
          mfa_enabled: !!verifiedFactor,
          mfa_factor_id: verifiedFactor?.id ?? null,
          mfa_created_at: verifiedFactor?.created_at ?? null,
        }
      })
    )

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[2FA status] Error:', error)
    return NextResponse.json({ error: 'Status ophalen mislukt.' }, { status: 500 })
  }
}
