import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { MedicatieDossierPDF } from '@/lib/medicatie-dossier-pdf'
import type { MedicatieItem } from '@/components/medicaties/medicatie-dossier'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Fetch data in parallel
    const [{ data: medicatiesRaw }, { data: profielRaw }] = await Promise.all([
      adminClient
        .from('medicatie_dossier')
        .select('*')
        .order('startdatum', { ascending: false }),
      adminClient
        .from('noah_profiel')
        .select('volledige_naam, geboortedatum')
        .limit(1)
        .single(),
    ])

    const medicaties = (medicatiesRaw ?? []) as MedicatieItem[]
    const profiel = (profielRaw ?? {}) as {
      volledige_naam?: string | null
      geboortedatum?: string | null
    }

    const noahNaam = profiel.volledige_naam ?? 'Noah'
    const noahGeboortedatum = profiel.geboortedatum ?? null
    const exportDatum = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(MedicatieDossierPDF, {
        medicaties,
        noahNaam,
        noahGeboortedatum,
        exportDatum,
      }) as React.ReactElement<DocumentProps>
    )

    const datumSlug = new Date().toISOString().slice(0, 10)
    const bestandsnaam = `Medicatiedossier-${noahNaam.replace(/\s+/g, '-')}-${datumSlug}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[export/medicatie-dossier] Fout:', error)
    return NextResponse.json({ error: 'PDF genereren mislukt.' }, { status: 500 })
  }
}
