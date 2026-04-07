import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/mail/leestatus  — markeer een bericht als gelezen voor de huidige gebruiker
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { messageId } = await request.json()
    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'messageId ontbreekt.' }, { status: 400 })
    }

    // ON CONFLICT DO NOTHING — dubbele aanroepen zijn veilig
    const { error } = await supabase
      .from('mail_leestatus')
      .insert({
        gmail_message_id: messageId,
        gebruiker_id: user.id,
      })
      .select()
      .single()

    // Conflict (al gelezen) is geen fout
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[mail/leestatus] Error:', err)
    return NextResponse.json({ error: 'Onverwachte fout.' }, { status: 500 })
  }
}
