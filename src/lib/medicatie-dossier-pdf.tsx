/**
 * Medicatiedossier PDF — gegenereerd met @react-pdf/renderer
 */
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { MedicatieItem } from '@/components/medicaties/medicatie-dossier'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  medicaties: MedicatieItem[]
  noahNaam: string
  noahGeboortedatum: string | null
  exportDatum: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GREEN = '#4A7C59'
const LIGHT_GREEN = '#EBF5EE'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#F9FAFB'
const RED = '#DC2626'
const ALT_ROW = '#F3F4F6'

const TIJDSTIP_ORDER = [
  'Ochtend', 'Ontbijt',
  'Middag', 'Lunch',
  'Namiddag', 'Avond', 'Avondeten',
  'Uur voor bedtijd', 'Bedtijd', 'Nacht',
  'Zo nodig', 'Dagelijks', 'Anders',
]

interface MedicatieGroep {
  naam: string
  werkzame_stof: string | null
  indicatie: string | null
  voorschrijver: string | null
  startdatum: string | null
  tijdstippen: { tijdstip: string | null; dosering: string | null }[]
}

function sorteerTijdstippen(
  items: { tijdstip: string | null; dosering: string | null }[]
): { tijdstip: string | null; dosering: string | null }[] {
  return [...items].sort((a, b) => {
    const ta = a.tijdstip ?? ''
    const tb = b.tijdstip ?? ''
    const re = /^(\d{1,2}):(\d{2})$/
    const ma = ta.match(re)
    const mb = tb.match(re)
    if (ma && mb)
      return (parseInt(ma[1]) * 60 + parseInt(ma[2])) -
             (parseInt(mb[1]) * 60 + parseInt(mb[2]))
    if (ma) return -1
    if (mb) return 1
    const ai = TIJDSTIP_ORDER.indexOf(ta)
    const bi = TIJDSTIP_ORDER.indexOf(tb)
    if (ai === -1 && bi === -1) return ta.localeCompare(tb, 'nl')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function groepeerActueelMedicatie(items: MedicatieItem[]): MedicatieGroep[] {
  const map = new Map<string, MedicatieGroep>()

  for (const item of items) {
    const key = item.naam.toLowerCase().trim()
    if (!map.has(key)) {
      map.set(key, {
        naam: item.naam.trim(),
        werkzame_stof: item.werkzame_stof ?? null,
        indicatie: item.indicatie ?? null,
        voorschrijver: item.voorschrijver ?? null,
        startdatum: item.startdatum ?? null,
        tijdstippen: [],
      })
    }
    const groep = map.get(key)!
    // Vroegste startdatum bijhouden
    if (item.startdatum && (!groep.startdatum || item.startdatum < groep.startdatum)) {
      groep.startdatum = item.startdatum
    }
    // Dedup: zelfde tijdstip + dosering niet twee keer opnemen
    const dk = `${(item.tijdstip ?? '').toLowerCase().trim()}|${(item.dosering ?? '').toLowerCase().trim()}`
    const bestaat = groep.tijdstippen.some(
      t => `${(t.tijdstip ?? '').toLowerCase().trim()}|${(t.dosering ?? '').toLowerCase().trim()}` === dk
    )
    if (!bestaat) {
      groep.tijdstippen.push({ tijdstip: item.tijdstip ?? null, dosering: item.dosering ?? null })
    }
  }

  return Array.from(map.values()).map(g => ({
    ...g,
    tijdstippen: sorteerTijdstippen(g.tijdstippen),
  }))
}

function formatDateNL(dateStr: string | null): string {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const maanden = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  const month = parseInt(parts[1], 10) - 1
  return `${parseInt(parts[2], 10)} ${maanden[month] ?? ''} ${parts[0]}`
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1F2937',
  },
  // Header
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    marginBottom: 4,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  headerNaam: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
  },
  headerGeboortedatum: {
    fontSize: 9,
    color: GRAY,
  },
  headerExportDatum: {
    fontSize: 8,
    color: GRAY,
  },
  headerVertrouwelijk: {
    fontSize: 7.5,
    color: RED,
    marginTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREEN,
  },
  // Table
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    color: 'white',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: ALT_ROW,
  },
  tableCell: {
    fontSize: 8.5,
    color: '#1F2937',
  },
  // Medicatie blok layout
  medBlok: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  medBlokHeader: {
    backgroundColor: '#4A7C59',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  medBlokNaam: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: 'white',
  },
  medBlokWerkzameStof: {
    fontSize: 8,
    color: '#C6E0CE',
    marginTop: 1,
  },
  medBlokVoorschrijver: {
    fontSize: 8,
    color: '#C6E0CE',
  },
  medBlokIndicatie: {
    backgroundColor: '#EBF5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  medBlokIndicatieTekst: {
    fontSize: 8,
    color: '#4A7C59',
  },
  medBlokRij: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  medBlokRijAlt: {
    backgroundColor: '#F3F4F6',
  },
  medBlokTijdstip: {
    fontSize: 9,
    color: '#1F2937',
    width: 110,
  },
  medBlokDosering: {
    fontSize: 9,
    color: '#6B7280',
    flex: 1,
  },
  // Column widths — historie
  colNaamH: { flex: 2 },
  colDoseringH: { flex: 1.6 },
  colTijdstipH: { flex: 1.2 },
  colStartH: { flex: 1.3 },
  colEindH: { flex: 1.3 },
  colRedenH: { flex: 2.6 },
  // Empty state
  emptyRow: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: LIGHT_GRAY,
  },
  emptyText: {
    fontSize: 8.5,
    color: GRAY,
    fontStyle: 'italic',
  },
  // Footnotes
  footnoteSection: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footnoteTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: GRAY,
    marginBottom: 5,
  },
  footnoteRow: {
    fontSize: 7.5,
    color: GRAY,
    marginBottom: 2,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7.5,
    color: GRAY,
  },
})

// ── Component ─────────────────────────────────────────────────────────────────

export function MedicatieDossierPDF({
  medicaties,
  noahNaam,
  noahGeboortedatum,
  exportDatum,
}: Props) {
  const actueelGroepen = groepeerActueelMedicatie(medicaties.filter((m) => m.actief))
  const historieItems = [...medicaties.filter((m) => !m.actief)].sort(
    (a, b) => (b.startdatum ?? '').localeCompare(a.startdatum ?? '')
  )

  // Unique FK refs deduplicated by naam+fk_url
  const fkRefs: { naam: string; url: string }[] = []
  const seen = new Set<string>()
  for (const item of medicaties) {
    if (item.fk_url) {
      const key = `${item.naam}::${item.fk_url}`
      if (!seen.has(key)) {
        seen.add(key)
        fkRefs.push({ naam: item.naam, url: item.fk_url })
      }
    }
  }
  fkRefs.sort((a, b) => a.naam.localeCompare(b.naam))

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Medicatiedossier</Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerNaam}>{noahNaam}</Text>
            {noahGeboortedatum && (
              <Text style={styles.headerGeboortedatum}>
                ({formatDateNL(noahGeboortedatum)})
              </Text>
            )}
          </View>
          <Text style={styles.headerExportDatum}>Exportdatum: {exportDatum}</Text>
          <Text style={styles.headerVertrouwelijk}>
            VERTROUWELIJK — BESTEMD VOOR ZORGDOELEINDEN
          </Text>
        </View>

        {/* Actuele medicatie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actuele medicatie</Text>
          {actueelGroepen.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Geen actuele medicatie</Text>
            </View>
          ) : (
            actueelGroepen.map((g, i) => (
              <View key={i} style={styles.medBlok}>
                {/* Naam + werkzame stof links, voorschrijver rechts */}
                <View style={styles.medBlokHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medBlokNaam}>{g.naam}</Text>
                    {g.werkzame_stof && (
                      <Text style={styles.medBlokWerkzameStof}>{g.werkzame_stof}</Text>
                    )}
                  </View>
                  {g.voorschrijver && (
                    <Text style={styles.medBlokVoorschrijver}>{g.voorschrijver}</Text>
                  )}
                </View>

                {/* Indicatie strip */}
                {g.indicatie && (
                  <View style={styles.medBlokIndicatie}>
                    <Text style={styles.medBlokIndicatieTekst}>
                      <Text style={{ fontFamily: 'Helvetica-Bold' }}>Indicatie: </Text>
                      {g.indicatie}
                    </Text>
                  </View>
                )}

                {/* Doseringsrijen in chronologische volgorde */}
                {g.tijdstippen.length === 0 ? (
                  <View style={[styles.medBlokRij]}>
                    <Text style={[styles.medBlokDosering, { fontStyle: 'italic' }]}>Geen doseringsgegevens</Text>
                  </View>
                ) : (
                  g.tijdstippen.map((t, j) => (
                    <View key={j} style={[styles.medBlokRij, j % 2 === 1 ? styles.medBlokRijAlt : {}]}>
                      <Text style={styles.medBlokTijdstip}>{t.tijdstip ?? '—'}</Text>
                      <Text style={styles.medBlokDosering}>{t.dosering ?? '—'}</Text>
                    </View>
                  ))
                )}
              </View>
            ))
          )}
        </View>

        {/* Medicatiehistorie */}
        {historieItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medicatiehistorie</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colNaamH]}>Naam</Text>
                <Text style={[styles.tableHeaderCell, styles.colDoseringH]}>Dosering</Text>
                <Text style={[styles.tableHeaderCell, styles.colTijdstipH]}>Tijdstip</Text>
                <Text style={[styles.tableHeaderCell, styles.colStartH]}>Startdatum</Text>
                <Text style={[styles.tableHeaderCell, styles.colEindH]}>Einddatum</Text>
                <Text style={[styles.tableHeaderCell, styles.colRedenH]}>Reden stop</Text>
              </View>
              {historieItems.map((item, i) => (
                <View
                  key={item.id}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <View style={styles.colNaamH}>
                    <Text style={styles.tableCell}>{item.naam}</Text>
                    {item.werkzame_stof && (
                      <Text style={[styles.tableCell, { color: GRAY, fontSize: 7.5 }]}>
                        {item.werkzame_stof}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.colDoseringH]}>{item.dosering ?? '—'}</Text>
                  <Text style={[styles.tableCell, styles.colTijdstipH]}>{item.tijdstip ?? '—'}</Text>
                  <Text style={[styles.tableCell, styles.colStartH]}>
                    {formatDateNL(item.startdatum)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colEindH]}>
                    {formatDateNL(item.einddatum)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colRedenH]}>
                    {item.reden_stop ?? '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footnotes */}
        {fkRefs.length > 0 && (
          <View style={styles.footnoteSection}>
            <Text style={styles.footnoteTitle}>Farmacotherapeutisch Kompas referenties</Text>
            {fkRefs.map((ref, i) => (
              <Text key={i} style={styles.footnoteRow}>
                {ref.naam}: {ref.url}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`}
          />
          <Text style={styles.footerText}>Vertrouwelijk</Text>
        </View>

      </Page>
    </Document>
  )
}
