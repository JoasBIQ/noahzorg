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

const TIJDSTIP_ORDER = ['Ochtend', 'Lunch', 'Uur voor bedtijd', 'Bedtijd', 'Zo nodig', 'Anders']

function sortByTijdstip(items: MedicatieItem[]): MedicatieItem[] {
  return [...items].sort((a, b) => {
    const ai = TIJDSTIP_ORDER.indexOf(a.tijdstip ?? 'Anders')
    const bi = TIJDSTIP_ORDER.indexOf(b.tijdstip ?? 'Anders')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
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
  // Column widths — actueel
  colNaam: { flex: 2.2 },
  colDosering: { flex: 1.8 },
  colTijdstip: { flex: 1.2 },
  colStartdatum: { flex: 1.4 },
  colVoorschrijver: { flex: 1.4 },
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
  const actueelItems = sortByTijdstip(medicaties.filter((m) => m.actief))
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
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colNaam]}>Naam</Text>
              <Text style={[styles.tableHeaderCell, styles.colDosering]}>Dosering</Text>
              <Text style={[styles.tableHeaderCell, styles.colTijdstip]}>Tijdstip</Text>
              <Text style={[styles.tableHeaderCell, styles.colStartdatum]}>Startdatum</Text>
              <Text style={[styles.tableHeaderCell, styles.colVoorschrijver]}>Voorschrijver</Text>
            </View>
            {actueelItems.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>Geen actuele medicatie</Text>
              </View>
            ) : (
              actueelItems.map((item, i) => (
                <View
                  key={item.id}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <View style={styles.colNaam}>
                    <Text style={styles.tableCell}>{item.naam}</Text>
                    {item.werkzame_stof && (
                      <Text style={[styles.tableCell, { color: GRAY, fontSize: 7.5 }]}>
                        {item.werkzame_stof}
                      </Text>
                    )}
                    {item.indicatie && (
                      <Text style={[styles.tableCell, { color: GRAY, fontSize: 7, fontStyle: 'italic' }]}>
                        {item.indicatie}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.colDosering]}>{item.dosering ?? '—'}</Text>
                  <Text style={[styles.tableCell, styles.colTijdstip]}>{item.tijdstip ?? '—'}</Text>
                  <Text style={[styles.tableCell, styles.colStartdatum]}>
                    {formatDateNL(item.startdatum)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colVoorschrijver]}>
                    {item.voorschrijver ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </View>
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
