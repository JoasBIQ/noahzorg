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
  DiagnoseData,
  TrajectData,
  MedicatieDossierExportData,
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
      wie_is_noah: true, persoonlijk: true, medisch: true, diagnoses: true,
      reanimatie: true, behandelaars: true, medicatie: true, zorgplan: true,
      trajecten: true, noodcontacten: true, dagbesteding: true,
    }

    const adminClient = createAdminClient()

    // ── Data ophalen (parallel) ───────────────────────────────────────────
    const [
      { data: profielRaw },
      { data: medicatieDossierRaw },
      { data: contactenRaw },
      { data: behandelaarsRaw },
      { data: zorgplanRaw },
      { data: dagbestedingRaw },
      { data: diagnosesRaw },
      { data: trajectenRaw },
    ] = await Promise.all([
      adminClient.from('noah_profiel').select('*').limit(1).single(),
      adminClient.from('medicatie_dossier').select('naam, werkzame_stof, indicatie, tijdstip, dosering, voorschrijver').eq('actief', true).order('naam'),
      adminClient.from('contacten').select('naam, functie, organisatie, telefoon, email, is_noodcontact, nood_volgorde').eq('gearchiveerd', false).order('nood_volgorde', { ascending: true, nullsFirst: false }),
      adminClient.from('behandelaars').select('naam, specialisme, ziekenhuis, telefoon, notities').eq('gearchiveerd', false).order('naam'),
      adminClient.from('zorgplan_afspraken').select('categorie, titel, omschrijving, wie_doet_het, frequentie').eq('actief', true).order('categorie'),
      adminClient.from('dagbesteding').select('naam, adres, contactpersoon, telefoon, dagen_tijden, activiteiten, bijzonderheden').order('naam'),
      adminClient.from('diagnoses').select('naam, datum_gesteld, gesteld_door, toelichting, onderbouwing, info_link_1, info_link_1_label, info_link_2, info_link_2_label, info_link_3, info_link_3_label').eq('actief', true).order('datum_gesteld'),
      adminClient.from('trajecten').select('naam_traject, organisatie, contactpersoon, contactpersoon_telefoon, startdatum, notities').eq('status', 'lopend').order('naam_traject'),
    ])

    // ── Typen casten ──────────────────────────────────────────────────────
    const profiel = (profielRaw ?? {}) as NoahProfielData
    const medicatieDossier = (medicatieDossierRaw ?? []) as MedicatieDossierExportData[]
    const contacten = (contactenRaw ?? []) as ContactData[]
    const behandelaars = (behandelaarsRaw ?? []) as BehandelaarData[]
    const zorgplan = (zorgplanRaw ?? []) as ZorgplanData[]
    const dagbesteding = (dagbestedingRaw ?? []) as DagbestedingData[]
    const diagnoses = (diagnosesRaw ?? []) as DiagnoseData[]
    const trajecten = (trajectenRaw ?? []) as TrajectData[]

    const exportDatum = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    // ── PDF genereren ─────────────────────────────────────────────────────
    const pdfBuffer = await renderToBuffer(
      React.createElement(NoahDossierPDF, {
        data: { profiel, medicatieDossier, contacten, behandelaars, zorgplan, dagbesteding, diagnoses, trajecten, secties, exportDatum },
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
