import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is verplicht.' }, { status: 400 })
    }

    const { data: reacties } = await supabase
      .from('mail_reacties')
      .select('*, profiles(naam, kleur)')
      .eq('gmail_message_id', messageId)
      .order('created_at', { ascending: true })

    return NextResponse.json({ reacties: reacties ?? [] })
  } catch (error) {
    console.error('[Gmail reacties GET] Error:', error)
    return NextResponse.json({ reacties: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { messageId, bericht } = await request.json()

    if (!messageId || !bericht?.trim()) {
      return NextResponse.json({ error: 'messageId en bericht zijn verplicht.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('mail_reacties')
      .insert({ gmail_message_id: messageId, auteur_id: user.id, bericht: bericht.trim() })
      .select('*, profiles(naam, kleur)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, reactie: data })
  } catch (error) {
    console.error('[Gmail reacties POST] Error:', error)
    return NextResponse.json({ error: 'Reactie plaatsen mislukt.' }, { status: 500 })
  }
}
