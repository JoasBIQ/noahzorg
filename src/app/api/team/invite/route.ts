import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole, Profile } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if the current user is a beheerder
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const currentProfile = profileData as unknown as Profile | null

    if (currentProfile?.rol !== 'beheerder') {
      return NextResponse.json(
        { error: 'Alleen beheerders kunnen uitnodigingen versturen.' },
        { status: 403 }
      )
    }

    const { email, naam, rol, kleur } = await request.json()

    if (!email || !naam) {
      return NextResponse.json(
        { error: 'E-mailadres en naam zijn verplicht.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Invite user via Supabase Auth
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://noahzorg.vercel.app'
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/invite-accept`,
        data: {
          naam,
          rol: (rol as UserRole) || 'gebruiker',
          kleur: kleur || '#93C5FD',
        },
      })

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      )
    }

    // Create profile for the invited user
    if (inviteData.user) {
      await adminClient.from('profiles').upsert({
        id: inviteData.user.id,
        naam,
        rol: (rol as UserRole) || 'gebruiker',
        kleur: kleur || '#93C5FD',
      } as unknown as never)
    }

    await adminClient.from('audit_log').insert({
      gebruiker_id: user.id,
      actie: 'uitgenodigd',
      module: 'team',
      omschrijving: `Gebruiker uitgenodigd: ${naam} (${email})`,
      metadata: { email, naam, rol, kleur },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het uitnodigen.' },
      { status: 500 }
    )
  }
}
