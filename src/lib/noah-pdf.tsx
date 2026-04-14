/**
 * Noah dossier PDF — gegenereerd met @react-pdf/renderer
 * Professioneel, rustig, geschikt voor externe zorginstanties.
 */
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NoahProfielData {
  volledige_naam?: string | null
  geboortedatum?: string | null
  diagnose?: string | null
  karakter?: string | null
  wat_fijn?: string | null
  wat_onrustig?: string | null
  communicatie?: string | null
  dagritme?: string | null
  eetgewoontes?: string | null
  slaap?: string | null
  activiteiten?: string | null
  gewoontes?: string | null
  wonen_huidig?: string | null
  financieel_notities?: string | null
  juridisch_notities?: string | null
  huisarts_naam?: string | null
  huisarts_praktijk?: string | null
  huisarts_telefoon?: string | null
  zorgkantoor?: string | null
  zorgkantoor_nummer?: string | null
  reanimatie_beleid?: string | null
  reanimatie_toelichting?: string | null
  reanimatie_gesprek_gevoerd?: boolean | null
  reanimatie_gesprek_datum?: string | null
  reanimatie_gesprek_met?: string | null
  medicatielijst_tekst?: string | null
}

export interface MedicatieData {
  naam: string
  dosering?: string | null
  frequentie?: string | null
  voorschrijver?: string | null
  notities?: string | null
}

export interface ContactData {
  naam: string
  functie?: string | null
  organisatie?: string | null
  telefoon?: string | null
  email?: string | null
  is_noodcontact?: boolean | null
  nood_volgorde?: number | null
}

export interface BehandelaarData {
  naam: string
  specialisme?: string | null
  ziekenhuis?: string | null
  telefoon?: string | null
  notities?: string | null
}

export interface ZorgplanData {
  categorie: string
  titel: string
  omschrijving?: string | null
  wie_doet_het?: string | null
  frequentie?: string | null
}

export interface DagbestedingData {
  naam: string
  adres?: string | null
  contactpersoon?: string | null
  telefoon?: string | null
  dagen_tijden?: string | null
  activiteiten?: string | null
  bijzonderheden?: string | null
}

export interface NoahDossierData {
  profiel: NoahProfielData
  medicaties: MedicatieData[]
  contacten: ContactData[]
  behandelaars: BehandelaarData[]
  zorgplan: ZorgplanData[]
  dagbesteding: DagbestedingData[]
  secties: ExportSecties
  exportDatum: string
}

export interface ExportSecties {
  wie_is_noah: boolean
  persoonlijk: boolean
  medisch: boolean
  medicatie: boolean
  reanimatie: boolean
  zorgplan: boolean
  noodcontacten: boolean
  dagbesteding: boolean
}

// ── Kleuren & stijlen ─────────────────────────────────────────────────────────

const GROEN = '#4A7C59'
const GROEN_LICHT = '#E8F2EC'
const GRIJS = '#6B7280'
const GRIJS_LICHT = '#F3F4F6'
const TEKST = '#1F2937'
const WIT = '#FFFFFF'
const RAND = '#E5E7EB'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FAFAF8',
    paddingTop: 50,
    paddingBottom: 65,
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    color: TEKST,
  },
  // Koptekst per pagina
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: RAND,
    paddingBottom: 8,
    marginBottom: 20,
  },
  headerNaam: { fontSize: 9, color: GROEN, fontFamily: 'Helvetica-Bold' },
  headerDatum: { fontSize: 9, color: GRIJS },
  // Voettekst
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: RAND,
    paddingTop: 6,
  },
  footerText: { fontSize: 8, color: GRIJS },
  // Voorblad
  voorblad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  voorbladIcoon: { width: 80, height: 80, marginBottom: 24 },
  voorbladNaam: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: GROEN,
    marginBottom: 8,
    textAlign: 'center',
  },
  voorbladSubtitel: {
    fontSize: 14,
    color: GRIJS,
    marginBottom: 4,
    textAlign: 'center',
  },
  voorbladGeboortedatum: {
    fontSize: 11,
    color: GRIJS,
    marginBottom: 32,
    textAlign: 'center',
  },
  voorbladScheidingslijn: {
    width: 60,
    height: 3,
    backgroundColor: GROEN,
    borderRadius: 2,
    marginBottom: 32,
  },
  voorbladDatumLabel: { fontSize: 10, color: GRIJS, textAlign: 'center' },
  voorbladDatum: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: TEKST, textAlign: 'center', marginTop: 2 },
  // Secties
  sectieContainer: { marginBottom: 22 },
  sectieKop: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: WIT,
    backgroundColor: GROEN,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  subKop: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: GROEN,
    marginBottom: 4,
    marginTop: 8,
  },
  // Tekst
  bodyTekst: { fontSize: 10, color: TEKST, lineHeight: 1.5, marginBottom: 4 },
  grijzeTekst: { fontSize: 10, color: GRIJS, fontStyle: 'italic' },
  // Rij-weergave (label + waarde)
  rij: { flexDirection: 'row', marginBottom: 4 },
  rijLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GRIJS,
    width: 110,
    flexShrink: 0,
  },
  rijWaarde: { fontSize: 10, color: TEKST, flex: 1, lineHeight: 1.4 },
  // Tabel
  tabel: { marginTop: 4 },
  tabelKopRij: {
    flexDirection: 'row',
    backgroundColor: GROEN,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 2,
  },
  tabelKopTekst: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: WIT },
  tabelRij: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: RAND,
  },
  tabelRijAlt: { backgroundColor: GRIJS_LICHT },
  tabelCel: { fontSize: 9, color: TEKST, lineHeight: 1.4 },
  tabelCelGrijs: { fontSize: 9, color: GRIJS, lineHeight: 1.4 },
  // Info-blok (groen kader)
  infoBlok: {
    backgroundColor: GROEN_LICHT,
    borderLeftWidth: 3,
    borderLeftColor: GROEN,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 2,
    marginBottom: 8,
  },
  infoBlokTekst: { fontSize: 10, color: TEKST, lineHeight: 1.5 },
  // Paginascheiding
  scheidingslijn: {
    borderBottomWidth: 1,
    borderBottomColor: RAND,
    marginVertical: 10,
  },
})

// ── Hulpfuncties ──────────────────────────────────────────────────────────────

function formatDatum(datum?: string | null): string {
  if (!datum) return '—'
  try {
    return new Date(datum).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return datum
  }
}

function Lege({ label }: { label: string }) {
  return <Text style={styles.grijzeTekst}>{label} niet ingevuld.</Text>
}

function Rij({ label, waarde }: { label: string; waarde?: string | null }) {
  if (!waarde) return null
  return (
    <View style={styles.rij}>
      <Text style={styles.rijLabel}>{label}</Text>
      <Text style={styles.rijWaarde}>{waarde}</Text>
    </View>
  )
}

function PageHeader({ naam, datum }: { naam: string; datum: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerNaam}>{naam} — Zorgprofiel</Text>
      <Text style={styles.headerDatum}>{datum}</Text>
    </View>
  )
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Vertrouwelijk — uitsluitend bestemd voor zorgdoeleinden</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`}
      />
    </View>
  )
}

// ── PDF Document ──────────────────────────────────────────────────────────────

export function NoahDossierPDF({ data }: { data: NoahDossierData }) {
  const { profiel, medicaties, contacten, behandelaars, zorgplan, dagbesteding, secties, exportDatum } = data
  const naam = profiel.volledige_naam ?? 'Noah'
  const noodcontacten = contacten
    .filter((c) => c.is_noodcontact)
    .sort((a, b) => (a.nood_volgorde ?? 99) - (b.nood_volgorde ?? 99))

  return (
    <Document title={`Zorgprofiel ${naam}`} author="Rondom Noah" subject="Zorgdossier">

      {/* ── Voorblad ────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.voorblad}>
          <Image src="/icons/icon-192x192.png" style={styles.voorbladIcoon} />
          <Text style={styles.voorbladNaam}>{naam}</Text>
          <Text style={styles.voorbladSubtitel}>Zorgprofiel</Text>
          <Text style={styles.voorbladSubtitel}>Opgesteld door de familie</Text>
          {profiel.geboortedatum && (
            <Text style={styles.voorbladGeboortedatum}>
              Geboren {formatDatum(profiel.geboortedatum)}
            </Text>
          )}
          <View style={styles.voorbladScheidingslijn} />
          <Text style={styles.voorbladDatumLabel}>Datum van export</Text>
          <Text style={styles.voorbladDatum}>{exportDatum}</Text>
        </View>
        <PageFooter />
      </Page>

      {/* ── Inhoudspagina's ─────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PageHeader naam={naam} datum={exportDatum} />

        {/* Wie is Noah */}
        {secties.wie_is_noah && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Wie is {naam}?</Text>

            {profiel.karakter ? (
              <>
                <Text style={styles.subKop}>Karakter</Text>
                <View style={styles.infoBlok}>
                  <Text style={styles.infoBlokTekst}>{profiel.karakter}</Text>
                </View>
              </>
            ) : null}

            {profiel.wat_fijn ? (
              <>
                <Text style={styles.subKop}>Wat maakt {naam} blij?</Text>
                <Text style={styles.bodyTekst}>{profiel.wat_fijn}</Text>
              </>
            ) : null}

            {profiel.wat_onrustig ? (
              <>
                <Text style={styles.subKop}>Wat maakt {naam} onrustig?</Text>
                <Text style={styles.bodyTekst}>{profiel.wat_onrustig}</Text>
              </>
            ) : null}

            {profiel.communicatie ? (
              <>
                <Text style={styles.subKop}>Communicatie</Text>
                <Text style={styles.bodyTekst}>{profiel.communicatie}</Text>
              </>
            ) : null}

            {!profiel.karakter && !profiel.wat_fijn && !profiel.wat_onrustig && !profiel.communicatie && (
              <Lege label="Persoonlijkheid en communicatie" />
            )}

            {/* Dagelijks leven */}
            {(profiel.dagritme || profiel.eetgewoontes || profiel.slaap || profiel.activiteiten || profiel.gewoontes) && (
              <>
                <Text style={[styles.subKop, { marginTop: 12 }]}>Dagelijks leven</Text>
                {profiel.dagritme && <Rij label="Dagritme" waarde={profiel.dagritme} />}
                {profiel.eetgewoontes && <Rij label="Eetgewoontes" waarde={profiel.eetgewoontes} />}
                {profiel.slaap && <Rij label="Slaap" waarde={profiel.slaap} />}
                {profiel.activiteiten && <Rij label="Activiteiten" waarde={profiel.activiteiten} />}
                {profiel.gewoontes && <Rij label="Gewoontes & rituelen" waarde={profiel.gewoontes} />}
              </>
            )}
          </View>
        )}

        {/* Persoonlijke gegevens */}
        {secties.persoonlijk && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Persoonlijke gegevens</Text>
            <Rij label="Volledige naam" waarde={profiel.volledige_naam} />
            <Rij label="Geboortedatum" waarde={formatDatum(profiel.geboortedatum)} />
            {profiel.wonen_huidig && <Rij label="Huidige woonsituatie" waarde={profiel.wonen_huidig} />}
            {profiel.juridisch_notities && (
              <>
                <Text style={styles.subKop}>Juridisch</Text>
                <Text style={styles.bodyTekst}>{profiel.juridisch_notities}</Text>
              </>
            )}
            {profiel.financieel_notities && (
              <>
                <Text style={styles.subKop}>Financieel</Text>
                <Text style={styles.bodyTekst}>{profiel.financieel_notities}</Text>
              </>
            )}
          </View>
        )}

        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <PageHeader naam={naam} datum={exportDatum} />

        {/* Medisch */}
        {secties.medisch && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Medisch</Text>

            {profiel.diagnose && (
              <>
                <Text style={styles.subKop}>Diagnose</Text>
                <View style={styles.infoBlok}>
                  <Text style={styles.infoBlokTekst}>{profiel.diagnose}</Text>
                </View>
              </>
            )}

            {(profiel.huisarts_naam || profiel.huisarts_praktijk || profiel.huisarts_telefoon) && (
              <>
                <Text style={styles.subKop}>Huisarts</Text>
                <Rij label="Naam" waarde={profiel.huisarts_naam} />
                <Rij label="Praktijk" waarde={profiel.huisarts_praktijk} />
                <Rij label="Telefoon" waarde={profiel.huisarts_telefoon} />
              </>
            )}

            {(profiel.zorgkantoor || profiel.zorgkantoor_nummer) && (
              <>
                <Text style={styles.subKop}>Zorgkantoor</Text>
                <Rij label="Naam" waarde={profiel.zorgkantoor} />
                <Rij label="Nummer" waarde={profiel.zorgkantoor_nummer} />
              </>
            )}

            {behandelaars.length > 0 && (
              <>
                <Text style={styles.subKop}>Behandelaars & specialisten</Text>
                <View style={styles.tabel}>
                  <View style={styles.tabelKopRij}>
                    <Text style={[styles.tabelKopTekst, { flex: 2 }]}>Naam</Text>
                    <Text style={[styles.tabelKopTekst, { flex: 2 }]}>Specialisme / Ziekenhuis</Text>
                    <Text style={[styles.tabelKopTekst, { flex: 1.5 }]}>Telefoon</Text>
                  </View>
                  {behandelaars.map((b, i) => (
                    <View key={i} style={[styles.tabelRij, i % 2 === 1 ? styles.tabelRijAlt : {}]}>
                      <Text style={[styles.tabelCel, { flex: 2 }]}>{b.naam}</Text>
                      <Text style={[styles.tabelCelGrijs, { flex: 2 }]}>
                        {[b.specialisme, b.ziekenhuis].filter(Boolean).join(' — ') || '—'}
                      </Text>
                      <Text style={[styles.tabelCelGrijs, { flex: 1.5 }]}>{b.telefoon ?? '—'}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Medicatie */}
        {secties.medicatie && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Medicatie</Text>
            {medicaties.length > 0 ? (
              <View style={styles.tabel}>
                <View style={styles.tabelKopRij}>
                  <Text style={[styles.tabelKopTekst, { flex: 2 }]}>Medicijn</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 1.5 }]}>Dosering</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 1.5 }]}>Frequentie</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 1.5 }]}>Voorschrijver</Text>
                </View>
                {medicaties.map((m, i) => (
                  <View key={i} style={[styles.tabelRij, i % 2 === 1 ? styles.tabelRijAlt : {}]}>
                    <Text style={[styles.tabelCel, { flex: 2 }]}>{m.naam}</Text>
                    <Text style={[styles.tabelCelGrijs, { flex: 1.5 }]}>{m.dosering ?? '—'}</Text>
                    <Text style={[styles.tabelCelGrijs, { flex: 1.5 }]}>{m.frequentie ?? '—'}</Text>
                    <Text style={[styles.tabelCelGrijs, { flex: 1.5 }]}>{m.voorschrijver ?? '—'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Lege label="Actieve medicatie" />
            )}
            {profiel.medicatielijst_tekst && (
              <>
                <Text style={styles.subKop}>Aanvullende medicatie-informatie</Text>
                <Text style={styles.bodyTekst}>{profiel.medicatielijst_tekst}</Text>
              </>
            )}
          </View>
        )}

        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <PageHeader naam={naam} datum={exportDatum} />

        {/* Reanimatiebeleid */}
        {secties.reanimatie && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Reanimatiebeleid</Text>
            {profiel.reanimatie_beleid ? (
              <>
                <View style={styles.infoBlok}>
                  <Text style={[styles.infoBlokTekst, { fontFamily: 'Helvetica-Bold' }]}>
                    Beleid: {profiel.reanimatie_beleid}
                  </Text>
                </View>
                {profiel.reanimatie_toelichting && (
                  <Text style={styles.bodyTekst}>{profiel.reanimatie_toelichting}</Text>
                )}
                {profiel.reanimatie_gesprek_gevoerd && (
                  <>
                    <Text style={styles.subKop}>Gesprek gevoerd</Text>
                    <Rij label="Datum" waarde={formatDatum(profiel.reanimatie_gesprek_datum)} />
                    <Rij label="Met" waarde={profiel.reanimatie_gesprek_met} />
                  </>
                )}
              </>
            ) : (
              <Lege label="Reanimatiebeleid" />
            )}
          </View>
        )}

        {/* Zorgplan */}
        {secties.zorgplan && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Zorgplan</Text>
            {zorgplan.length > 0 ? (
              <View style={styles.tabel}>
                <View style={styles.tabelKopRij}>
                  <Text style={[styles.tabelKopTekst, { flex: 1 }]}>Categorie</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 2 }]}>Afspraak</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 1.5 }]}>Wie</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 1 }]}>Frequentie</Text>
                </View>
                {zorgplan.map((z, i) => (
                  <View key={i} style={[styles.tabelRij, i % 2 === 1 ? styles.tabelRijAlt : {}]}>
                    <Text style={[styles.tabelCelGrijs, { flex: 1 }]}>{z.categorie}</Text>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.tabelCel, { fontFamily: 'Helvetica-Bold', marginBottom: 1 }]}>{z.titel}</Text>
                      {z.omschrijving && <Text style={styles.tabelCelGrijs}>{z.omschrijving}</Text>}
                    </View>
                    <Text style={[styles.tabelCelGrijs, { flex: 1.5 }]}>{z.wie_doet_het ?? '—'}</Text>
                    <Text style={[styles.tabelCelGrijs, { flex: 1 }]}>{z.frequentie ?? '—'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Lege label="Zorgplanafspraken" />
            )}
          </View>
        )}

        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <PageHeader naam={naam} datum={exportDatum} />

        {/* Noodcontacten */}
        {secties.noodcontacten && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Noodcontacten</Text>
            {noodcontacten.length > 0 ? (
              <View style={styles.tabel}>
                <View style={styles.tabelKopRij}>
                  <Text style={[styles.tabelKopTekst, { flex: 2 }]}>Naam</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 1.5 }]}>Functie / Organisatie</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 1.5 }]}>Telefoon</Text>
                  <Text style={[styles.tabelKopTekst, { flex: 2 }]}>E-mail</Text>
                </View>
                {noodcontacten.map((c, i) => (
                  <View key={i} style={[styles.tabelRij, i % 2 === 1 ? styles.tabelRijAlt : {}]}>
                    <Text style={[styles.tabelCel, { flex: 2, fontFamily: 'Helvetica-Bold' }]}>{c.naam}</Text>
                    <Text style={[styles.tabelCelGrijs, { flex: 1.5 }]}>
                      {[c.functie, c.organisatie].filter(Boolean).join(' — ') || '—'}
                    </Text>
                    <Text style={[styles.tabelCelGrijs, { flex: 1.5 }]}>{c.telefoon ?? '—'}</Text>
                    <Text style={[styles.tabelCelGrijs, { flex: 2 }]}>{c.email ?? '—'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Lege label="Noodcontacten" />
            )}
          </View>
        )}

        {/* Dagbesteding */}
        {secties.dagbesteding && dagbesteding.length > 0 && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Dagbesteding</Text>
            {dagbesteding.map((d, i) => (
              <View key={i} style={[styles.infoBlok, { marginBottom: 8 }]}>
                <Text style={[styles.infoBlokTekst, { fontFamily: 'Helvetica-Bold', marginBottom: 4 }]}>{d.naam}</Text>
                {d.adres && <Rij label="Adres" waarde={d.adres} />}
                {d.contactpersoon && <Rij label="Contactpersoon" waarde={d.contactpersoon} />}
                {d.telefoon && <Rij label="Telefoon" waarde={d.telefoon} />}
                {d.dagen_tijden && <Rij label="Dagen & tijden" waarde={d.dagen_tijden} />}
                {d.activiteiten && <Rij label="Activiteiten" waarde={d.activiteiten} />}
                {d.bijzonderheden && <Rij label="Bijzonderheden" waarde={d.bijzonderheden} />}
              </View>
            ))}
          </View>
        )}
        {secties.dagbesteding && dagbesteding.length === 0 && (
          <View style={styles.sectieContainer}>
            <Text style={styles.sectieKop}>Dagbesteding</Text>
            <Lege label="Dagbesteding" />
          </View>
        )}

        <PageFooter />
      </Page>

    </Document>
  )
}
