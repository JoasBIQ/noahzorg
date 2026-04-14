'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, CheckSquare, Square, AlertCircle, Loader2 } from 'lucide-react'
import type { ExportSecties } from '@/lib/noah-pdf'

const SECTIES: { key: keyof ExportSecties; label: string; omschrijving: string }[] = [
  {
    key: 'wie_is_noah',
    label: 'Wie is Noah',
    omschrijving: 'Karakter, voorkeuren, communicatie en dagritme',
  },
  {
    key: 'persoonlijk',
    label: 'Persoonlijke gegevens',
    omschrijving: 'Naam en geboortedatum',
  },
  {
    key: 'medisch',
    label: 'Medisch',
    omschrijving: 'Huisarts, diagnose en zorgkantoor',
  },
  {
    key: 'diagnoses',
    label: 'Diagnoses',
    omschrijving: 'Alle diagnoses met toelichting en informatiebronnen',
  },
  {
    key: 'reanimatie',
    label: 'Reanimatiebeleid',
    omschrijving: 'Het vastgestelde beleid en toelichting',
  },
  {
    key: 'behandelaars',
    label: 'Behandelaars',
    omschrijving: 'Artsen en therapeuten',
  },
  {
    key: 'medicatie',
    label: 'Actuele medicatie',
    omschrijving: 'Medicatieschema met tijdstip en dosering',
  },
  {
    key: 'zorgplan',
    label: 'Zorgplan',
    omschrijving: 'Actieve zorgplanafspraken per categorie',
  },
  {
    key: 'trajecten',
    label: 'Trajecten',
    omschrijving: 'Lopende zorgtrajecten',
  },
  {
    key: 'noodcontacten',
    label: 'Noodcontacten',
    omschrijving: 'Contactpersonen voor noodsituaties met telefoonnummers',
  },
  {
    key: 'dagbesteding',
    label: 'Dagbesteding',
    omschrijving: 'Dagbestedingslocaties, tijden en contactpersonen',
  },
]

export function ExportPage() {
  const [secties, setSecties] = useState<ExportSecties>({
    wie_is_noah: true,
    persoonlijk: true,
    medisch: true,
    diagnoses: true,
    reanimatie: true,
    behandelaars: true,
    medicatie: true,
    zorgplan: true,
    trajecten: true,
    noodcontacten: true,
    dagbesteding: true,
  })
  const [loading, setLoading] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  const toggleSectie = (key: keyof ExportSecties) => {
    setSecties((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const alleAangevinkt = Object.values(secties).every(Boolean)
  const geenAangevinkt = Object.values(secties).every((v) => !v)

  const toggleAlles = () => {
    const nieuweWaarde = !alleAangevinkt
    setSecties(
      Object.fromEntries(
        Object.keys(secties).map((k) => [k, nieuweWaarde])
      ) as unknown as ExportSecties
    )
  }

  const handleGenereer = async () => {
    if (geenAangevinkt) {
      setFout('Selecteer minimaal één sectie om te exporteren.')
      return
    }
    setFout(null)
    setLoading(true)

    try {
      const res = await fetch('/api/export/noah-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secties }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Fout ${res.status}`)
      }

      // PDF als blob downloaden
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Bestandsnaam uit Content-Disposition header
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="?([^";]+)"?/)
      const bestandsnaam = match?.[1] ?? 'Zorgprofiel-Noah.pdf'

      const a = document.createElement('a')
      a.href = url
      a.download = bestandsnaam
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'PDF genereren mislukt. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A7C59]/10">
            <FileText className="h-6 w-6 text-[#4A7C59]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Exporteer dossier</h1>
        </div>
        <p className="text-[#6B7280] text-sm leading-relaxed">
          Genereer een PDF-overzicht van Noah&apos;s zorgprofiel voor externe zorginstanties.
          Het document is professioneel opgemaakt en bevat alleen de door jou geselecteerde secties.
        </p>
      </motion.div>

      {/* Sectie-selectie */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6"
      >
        {/* Header kaart */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Selecteer secties</h2>
          <button
            onClick={toggleAlles}
            className="text-xs font-medium text-[#4A7C59] hover:underline"
          >
            {alleAangevinkt ? 'Alles uitvinken' : 'Alles aanvinken'}
          </button>
        </div>

        {/* Lijst */}
        <ul className="divide-y divide-gray-100">
          {SECTIES.map(({ key, label, omschrijving }) => (
            <li key={key}>
              <button
                onClick={() => toggleSectie(key)}
                className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {secties[key] ? (
                    <CheckSquare className="h-5 w-5 text-[#4A7C59]" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${secties[key] ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{omschrijving}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Info-blok */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-[#E8F2EC] border border-[#4A7C59]/20 rounded-xl px-4 py-3 mb-6 flex gap-3"
      >
        <AlertCircle className="h-4 w-4 text-[#4A7C59] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#4A7C59] leading-relaxed">
          Het PDF-document is vertrouwelijk en bedoeld voor externe zorginstanties.
          Het bevat géén interne familienotities, berichten of accountgegevens.
        </p>
      </motion.div>

      {/* Foutmelding */}
      {fout && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{fout}</p>
        </div>
      )}

      {/* Genereer-knop */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleGenereer}
        disabled={loading || geenAangevinkt}
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#4A7C59] px-6 py-4 text-base font-semibold text-white shadow-sm hover:bg-[#3d6a4a] active:bg-[#356040] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            PDF genereren…
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Genereer PDF
          </>
        )}
      </motion.button>

      {loading && (
        <p className="text-center text-xs text-[#6B7280] mt-3">
          Dit kan enkele seconden duren…
        </p>
      )}
    </div>
  )
}
