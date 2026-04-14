import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { NoahDossierPDF } from '@/lib/noah-pdf'
import type {
  ExportSecties,
  NoahProfielData,
  MedicatieData,
  ContactData,
  BehandelaarData,
  ZorgplanData,
  DagbestedingData,
} from '@/lib/noah-pdf'

export const dynamic = 'force-dynamic'
// PDF genereren kan even duren
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const body = await request.json()
    const secties: ExportSecties = body.secties ?? {
      wie_is_noah: true, persoonlijk: true, medisch: true,
      medicatie: true, reanimatie: true, zorgplan: true,
      noodcontacten: true, dagbesteding: true,
    }

    const adminClient = createAdminClient()

    // ── Data ophalen (parallel) ───────────────────────────────────────────
    const [
      { data: profielRaw },
      { data: medicatiesRaw },
      { data: contactenRaw },
      { data: behandelaarsRaw },
      { data: zorgplanRaw },
      { data: dagbestedingRaw },
    ] = await Promise.all([
      adminClient.from('noah_profiel').select('*').limit(1).single(),
      adminClient
        .from('medicaties')
        .select('naam, dosering, frequentie, voorschrijver, notities, status')
        .eq('gearchiveerd', false)
        .eq('status', 'actief')
        .order('naam'),
      adminClient
        .from('contacten')
        .select('naam, functie, organisatie, telefoon, email, is_noodcontact, nood_volgorde')
        .eq('gearchiveerd', false)
        .order('nood_volgorde', { ascending: true, nullsFirst: false }),
      adminClient
        .from('behandelaars')
        .select('naam, specialisme, ziekenhuis, telefoon, notities')
        .eq('gearchiveerd', false)
        .order('naam'),
      adminClient
        .from('zorgplan_afspraken')
        .select('categorie, titel, omschrijving, wie_doet_het, frequentie')
        .eq('actief', true)
        .order('categorie'),
      adminClient
        .from('dagbesteding')
        .select('naam, adres, contactpersoon, telefoon, dagen_tijden, activiteiten, bijzonderheden')
        .order('naam'),
    ])

    // ── Typen casten ──────────────────────────────────────────────────────
    const profiel = (profielRaw ?? {}) as NoahProfielData
    const medicaties = (medicatiesRaw ?? []) as MedicatieData[]
    const contacten = (contactenRaw ?? []) as ContactData[]
    const behandelaars = (behandelaarsRaw ?? []) as BehandelaarData[]
    const zorgplan = (zorgplanRaw ?? []) as ZorgplanData[]
    const dagbesteding = (dagbestedingRaw ?? []) as DagbestedingData[]

    const exportDatum = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    // ── PDF genereren ─────────────────────────────────────────────────────
    const pdfBuffer = await renderToBuffer(
      React.createElement(NoahDossierPDF, {
        data: { profiel, medicaties, contacten, behandelaars, zorgplan, dagbesteding, secties, exportDatum },
      }) as React.ReactElement<DocumentProps>
    )

    const naam = profiel.volledige_naam ?? 'Noah'
    const datumSlug = new Date().toISOString().slice(0, 10)
    const bestandsnaam = `Zorgprofiel-${naam.replace(/\s+/g, '-')}-${datumSlug}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[export/noah-dossier] Fout:', error)
    return NextResponse.json({ error: 'PDF genereren mislukt.' }, { status: 500 })
  }
}
