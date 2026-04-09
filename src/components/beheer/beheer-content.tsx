'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Save, ExternalLink, Settings, CheckCircle, Calendar, Archive, RotateCcw, Mail, X, HardDrive, FolderPlus, Loader2, FolderOpen, ShieldCheck, ShieldOff, RefreshCw, Bell, BellRing } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AuditLog } from '@/components/beheer/audit-log'
import type { Profile } from '@/types'

interface BeheerContentProps {
  currentUserId: string
  allProfiles: Profile[]
}

type ArchivedItem = {
  id: string
  label: string
  sublabel: string
  tabel: string
}

export function BeheerContent({ currentUserId, allProfiles }: BeheerContentProps) {
  const searchParams = useSearchParams()
  const gmailParam = searchParams.get('gmail')

  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)
  const [loadingGmail, setLoadingGmail] = useState(true)
  const [disconnectingGmail, setDisconnectingGmail] = useState(false)
  const [gmailBanner, setGmailBanner] = useState<'connected' | 'error' | null>(
    gmailParam === 'connected' ? 'connected' : gmailParam === 'error' ? 'error' : null
  )

  const [keeperUrl, setKeeperUrl] = useState('')
  const [savedKeeperUrl, setSavedKeeperUrl] = useState('')
  const [icalUrl, setIcalUrl] = useState('')
  const [savedIcalUrl, setSavedIcalUrl] = useState('')
  const [trelloApiKey, setTrelloApiKey] = useState('')
  const [savedTrelloApiKey, setSavedTrelloApiKey] = useState('')
  const [trelloApiToken, setTrelloApiToken] = useState('')
  const [savedTrelloApiToken, setSavedTrelloApiToken] = useState('')
  const [trelloBoardId, setTrelloBoardId] = useState('')
  const [savedTrelloBoardId, setSavedTrelloBoardId] = useState('')
  const [savingTrelloApi, setSavingTrelloApi] = useState(false)
  const [successTrelloApi, setSuccessTrelloApi] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingKeeper, setSavingKeeper] = useState(false)
  const [savingIcal, setSavingIcal] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successKeeper, setSuccessKeeper] = useState(false)
  const [successIcal, setSuccessIcal] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([])
  const [loadingArchief, setLoadingArchief] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // 2FA beheer
  type MfaUser = {
    id: string; naam: string; rol: string; kleur: string
    mfa_enabled: boolean; mfa_factor_id: string | null; mfa_created_at: string | null
  }
  const [mfaUsers, setMfaUsers] = useState<MfaUser[]>([])
  const [loadingMfa, setLoadingMfa] = useState(false)
  const [mfaLoaded, setMfaLoaded] = useState(false)
  const [resettingMfa, setResettingMfa] = useState<string | null>(null)
  const [mfaResetSuccess, setMfaResetSuccess] = useState<string | null>(null)

  const fetchMfaStatus = async () => {
    setLoadingMfa(true)
    try {
      const res = await fetch('/api/2fa/status')
      const data = await res.json()
      setMfaUsers(data.users ?? [])
      setMfaLoaded(true)
    } finally {
      setLoadingMfa(false)
    }
  }

  const handleMfaReset = async (userId: string, factorId: string, naam: string) => {
    if (!confirm(`Weet je zeker dat je 2FA wilt resetten voor ${naam}? Ze moeten dan opnieuw instellen.`)) return
    setResettingMfa(userId)
    const res = await fetch('/api/2fa/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, factorId }),
    })
    if (res.ok) {
      setMfaResetSuccess(userId)
      setTimeout(() => setMfaResetSuccess(null), 3000)
      await fetchMfaStatus()
    }
    setResettingMfa(null)
  }

  // Drive mappenstructuur
  type FolderResult = { name: string; id: string; key: string | null; status: 'aangemaakt' | 'bestaand' }
  const [settingUpDrive, setSettingUpDrive] = useState(false)
  const [driveSetupResult, setDriveSetupResult] = useState<{ folders: FolderResult[]; aangemaakt: number; bestaand: number } | null>(null)
  const [driveSetupError, setDriveSetupError] = useState<string | null>(null)

  const fetchArchief = async () => {
    setLoadingArchief(true)
    const [
      medicaties,
      contacten,
      dossierItems,
      documentVerwijzingen,
      behandelaars,
      overleggen,
      logboek,
    ] = await Promise.all([
      supabase.from('medicaties').select('id, naam, dosering, status').eq('gearchiveerd', true),
      supabase.from('contacten').select('id, naam, functie').eq('gearchiveerd', true),
      supabase.from('dossier_items').select('id, titel, categorie').eq('gearchiveerd', true),
      supabase.from('document_verwijzingen').select('id, naam, locatie').eq('gearchiveerd', true),
      supabase.from('behandelaars').select('id, naam, specialisme').eq('gearchiveerd', true),
      supabase.from('overleggen').select('id, titel, datum_tijd').eq('gearchiveerd', true),
      supabase.from('logboek').select('id, bericht, auteur_id').eq('gearchiveerd', true),
    ])

    const items: ArchivedItem[] = []

    for (const row of (medicaties.data ?? [])) {
      items.push({ id: row.id, label: row.naam, sublabel: [row.dosering, row.status].filter(Boolean).join(' · '), tabel: 'medicaties' })
    }
    for (const row of (contacten.data ?? [])) {
      items.push({ id: row.id, label: row.naam, sublabel: row.functie ?? '', tabel: 'contacten' })
    }
    for (const row of (dossierItems.data ?? [])) {
      items.push({ id: row.id, label: row.titel, sublabel: row.categorie ?? '', tabel: 'dossier_items' })
    }
    for (const row of (documentVerwijzingen.data ?? [])) {
      items.push({ id: row.id, label: row.naam, sublabel: row.locatie ?? '', tabel: 'document_verwijzingen' })
    }
    for (const row of (behandelaars.data ?? [])) {
      items.push({ id: row.id, label: row.naam, sublabel: row.specialisme ?? '', tabel: 'behandelaars' })
    }
    for (const row of (overleggen.data ?? [])) {
      const datum = row.datum_tijd ? new Date(row.datum_tijd).toLocaleDateString('nl-NL') : ''
      items.push({ id: row.id, label: row.titel, sublabel: datum, tabel: 'overleggen' })
    }
    for (const row of (logboek.data ?? [])) {
      const snippet = row.bericht.slice(0, 60) + (row.bericht.length > 60 ? '...' : '')
      items.push({ id: row.id, label: snippet, sublabel: row.auteur_id ?? '', tabel: 'logboek' })
    }

    setArchivedItems(items)
    setLoadingArchief(false)
  }

  const handleRestore = async (item: ArchivedItem) => {
    setRestoringId(item.id)
    await supabase
      .from(item.tabel)
      .update({ gearchiveerd: false })
      .eq('id', item.id)
    setRestoringId(null)
    setArchivedItems((prev) => prev.filter((i) => i.id !== item.id || i.tabel !== item.tabel))
  }

  useEffect(() => {
    fetchArchief()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: allSettings } = await supabase
        .from('app_instellingen')
        .select('*')

      if (allSettings) {
        const keeper = allSettings.find((s: any) => s.key === 'keeper_url')
        if (keeper) {
          setKeeperUrl(keeper.value)
          setSavedKeeperUrl(keeper.value)
        }
        const ical = allSettings.find((s: any) => s.key === 'calendar_ical_url')
        if (ical) {
          setIcalUrl(ical.value)
          setSavedIcalUrl(ical.value)
        }
        const apiKey = allSettings.find((s: any) => s.key === 'trello_api_key')
        if (apiKey) {
          setTrelloApiKey(apiKey.value)
          setSavedTrelloApiKey(apiKey.value)
        }
        const apiToken = allSettings.find((s: any) => s.key === 'trello_api_token')
        if (apiToken) {
          setTrelloApiToken(apiToken.value)
          setSavedTrelloApiToken(apiToken.value)
        }
        const boardId = allSettings.find((s: any) => s.key === 'trello_board_id')
        if (boardId) {
          setTrelloBoardId(boardId.value)
          setSavedTrelloBoardId(boardId.value)
        }
      }
      setLoading(false)
    }
    fetchSettings()
  }, [supabase])

  const handleSaveUrl = async (key: string, value: string, savedValue: string, setSaved: (v: string) => void, setSuccessFlag: (v: boolean) => void, setSavingFlag: (v: boolean) => void) => {
    setSavingFlag(true)
    setSuccessFlag(false)

    try {
      if (savedValue) {
        await supabase
          .from('app_instellingen')
          .update({ value: value.trim(), updated_by: currentUserId })
          .eq('key', key)
      } else {
        await supabase
          .from('app_instellingen')
          .insert({ key, value: value.trim(), updated_by: currentUserId })
      }

      setSaved(value.trim())
      setSuccessFlag(true)
      setTimeout(() => setSuccessFlag(false), 3000)
    } finally {
      setSavingFlag(false)
    }
  }


  useEffect(() => {
    const fetchGmailStatus = async () => {
      try {
        const res = await fetch('/api/gmail/status')
        const data = await res.json()
        setGmailConnected(data.connected)
        setGmailEmail(data.email ?? null)
      } finally {
        setLoadingGmail(false)
      }
    }
    fetchGmailStatus()
  }, [])

  const handleGmailDisconnect = async () => {
    if (!window.confirm('Weet je zeker dat je Gmail wilt ontkoppelen?')) return
    setDisconnectingGmail(true)
    try {
      await fetch('/api/gmail/disconnect', { method: 'DELETE' })
      setGmailConnected(false)
      setGmailEmail(null)
      setGmailBanner(null)
    } finally {
      setDisconnectingGmail(false)
    }
  }

  const handleSaveKeeperUrl = () =>
    handleSaveUrl('keeper_url', keeperUrl, savedKeeperUrl, setSavedKeeperUrl, setSuccessKeeper, setSavingKeeper)

  const handleSaveIcalUrl = () =>
    handleSaveUrl('calendar_ical_url', icalUrl, savedIcalUrl, setSavedIcalUrl, setSuccessIcal, setSavingIcal)

  const handleSaveTrelloApi = async () => {
    setSavingTrelloApi(true)
    setSuccessTrelloApi(false)

    try {
      const settings = [
        { key: 'trello_api_key', value: trelloApiKey.trim(), saved: savedTrelloApiKey, setSaved: setSavedTrelloApiKey },
        { key: 'trello_api_token', value: trelloApiToken.trim(), saved: savedTrelloApiToken, setSaved: setSavedTrelloApiToken },
        { key: 'trello_board_id', value: trelloBoardId.trim(), saved: savedTrelloBoardId, setSaved: setSavedTrelloBoardId },
      ]

      for (const s of settings) {
        if (s.saved) {
          await supabase
            .from('app_instellingen')
            .update({ value: s.value, updated_by: currentUserId })
            .eq('key', s.key)
        } else {
          await supabase
            .from('app_instellingen')
            .insert({ key: s.key, value: s.value, updated_by: currentUserId })
        }
        s.setSaved(s.value)
      }

      setSuccessTrelloApi(true)
      setTimeout(() => setSuccessTrelloApi(false), 3000)
    } finally {
      setSavingTrelloApi(false)
    }
  }

  const handleSetupDriveFolders = async () => {
    setSettingUpDrive(true)
    setDriveSetupResult(null)
    setDriveSetupError(null)
    try {
      const res = await fetch('/api/drive/setup-folders', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setDriveSetupError(data.error ?? 'Onbekende fout.')
      } else {
        setDriveSetupResult({ folders: data.folders, aangemaakt: data.aangemaakt, bestaand: data.bestaand })
      }
    } catch {
      setDriveSetupError('Verzoek mislukt — controleer je verbinding.')
    } finally {
      setSettingUpDrive(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center">
        <div className="animate-pulse text-muted">Laden...</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Trello API instellingen */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">
              Trello API
            </h2>
          </div>

          <p className="text-sm text-[#6B7280] mb-4">
            Koppel het Trello-bord via de API om kaarten direct in de app te tonen. Haal je API key en token op via{' '}
            <a
              href="https://trello.com/app-key"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4A7C59] hover:underline"
            >
              trello.com/app-key
            </a>
          </p>

          <div className="space-y-3">
            <Input
              label="API Key"
              type="text"
              value={trelloApiKey}
              onChange={(e) => {
                setTrelloApiKey(e.target.value)
                setSuccessTrelloApi(false)
              }}
              placeholder="Je Trello API key"
            />

            <Input
              label="API Token"
              type="text"
              value={trelloApiToken}
              onChange={(e) => {
                setTrelloApiToken(e.target.value)
                setSuccessTrelloApi(false)
              }}
              placeholder="Je Trello API token"
            />

            <Input
              label="Bord ID"
              type="text"
              value={trelloBoardId}
              onChange={(e) => {
                setTrelloBoardId(e.target.value)
                setSuccessTrelloApi(false)
              }}
              placeholder="Het ID van het Trello-bord"
            />

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveTrelloApi}
                disabled={
                  savingTrelloApi ||
                  !trelloApiKey.trim() ||
                  !trelloApiToken.trim() ||
                  !trelloBoardId.trim() ||
                  (trelloApiKey.trim() === savedTrelloApiKey &&
                    trelloApiToken.trim() === savedTrelloApiToken &&
                    trelloBoardId.trim() === savedTrelloBoardId)
                }
              >
                <span className="flex items-center gap-1.5">
                  <Save size={16} />
                  {savingTrelloApi ? 'Opslaan...' : 'Opslaan'}
                </span>
              </Button>

              {successTrelloApi && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle size={14} />
                  Opgeslagen
                </span>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Keeper instellingen */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">
              Keeper (wachtwoordbeheer)
            </h2>
          </div>

          <p className="text-sm text-[#6B7280] mb-4">
            Stel hier de link in naar de Keeper-kluis. Deze wordt getoond op het Noah-profiel bij &quot;Toegang en accounts&quot;.
          </p>

          <div className="space-y-3">
            <Input
              label="Keeper URL"
              type="url"
              value={keeperUrl}
              onChange={(e) => {
                setKeeperUrl(e.target.value)
                setSuccessKeeper(false)
              }}
              placeholder="https://keepersecurity.com/vault/..."
            />

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveKeeperUrl}
                disabled={savingKeeper || !keeperUrl.trim() || keeperUrl.trim() === savedKeeperUrl}
              >
                <span className="flex items-center gap-1.5">
                  <Save size={16} />
                  {savingKeeper ? 'Opslaan...' : 'Opslaan'}
                </span>
              </Button>

              {savedKeeperUrl && (
                <a
                  href={savedKeeperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-[#4A7C59] hover:underline"
                >
                  <ExternalLink size={14} />
                  Openen
                </a>
              )}

              {successKeeper && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle size={14} />
                  Opgeslagen
                </span>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Agenda (iCal) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">
              Agenda (iCal koppeling)
            </h2>
          </div>

          <p className="text-sm text-[#6B7280] mb-4">
            Plak hier een iCal/ICS URL om een externe agenda (bijv. Google Calendar) te tonen in de agenda. Events worden elke 15 minuten ververst. Laat leeg om alleen lokale items te tonen.
          </p>

          <div className="space-y-3">
            <Input
              label="iCal URL"
              type="url"
              value={icalUrl}
              onChange={(e) => {
                setIcalUrl(e.target.value)
                setSuccessIcal(false)
              }}
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            />

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveIcalUrl}
                disabled={savingIcal || icalUrl.trim() === savedIcalUrl}
              >
                <span className="flex items-center gap-1.5">
                  <Save size={16} />
                  {savingIcal ? 'Opslaan...' : 'Opslaan'}
                </span>
              </Button>

              {successIcal && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle size={14} />
                  Opgeslagen
                </span>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Gmail koppeling */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Mail size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">Gmail koppeling</h2>
          </div>

          {gmailBanner === 'connected' && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} />
                Gmail succesvol gekoppeld!
              </span>
              <button onClick={() => setGmailBanner(null)}>
                <X size={14} className="text-green-600 hover:text-green-800" />
              </button>
            </div>
          )}
          {gmailBanner === 'error' && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <span>Koppelen mislukt — probeer het opnieuw.</span>
              <button onClick={() => setGmailBanner(null)}>
                <X size={14} className="text-red-600 hover:text-red-800" />
              </button>
            </div>
          )}

          {loadingGmail ? (
            <p className="text-sm text-[#6B7280] animate-pulse">Status laden...</p>
          ) : gmailConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle size={16} className="text-green-600" />
                <span>Verbonden als <strong>{gmailEmail}</strong></span>
              </div>
              <p className="text-sm text-[#6B7280]">
                E-mails in de inbox worden getoond op de Mail-pagina. Alle familie-leden kunnen lezen en discussiëren.
              </p>
              <Button
                variant="ghost"
                onClick={handleGmailDisconnect}
                disabled={disconnectingGmail}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                {disconnectingGmail ? 'Ontkoppelen...' : 'Gmail ontkoppelen'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#6B7280]">
                Koppel een Gmail-account om e-mails over Noah in de app te lezen. Alleen leestoegang — er worden geen mails verstuurd vanuit de app.
              </p>
              <a
                href="/api/gmail/auth"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A7C59] text-white rounded-xl text-sm font-medium hover:bg-[#3d6a4a] transition-colors"
              >
                <ExternalLink size={14} />
                Gmail koppelen via Google
              </a>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Gebruikersbeheer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">
              Gebruikersbeheer
            </h2>
          </div>
          <p className="text-sm text-[#6B7280]">
            Gebruikers uitnodigen en rollen aanpassen kan via de Rondom Noah pagina.
          </p>
        </Card>
      </motion.div>

      {/* Google Agenda koppeling */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">Google Agenda</h2>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            <span className="text-sm text-[#6B7280]">Nog niet gekoppeld</span>
          </div>
          <p className="text-sm text-[#6B7280] mb-4">
            Koppeling wordt geactiveerd zodra het Google-account van Noah beschikbaar is. Zodra je de
            Google Calendar OAuth-credentials hebt ingesteld in de omgevingsvariabelen, verschijnt hier
            de koppelknop.
          </p>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed"
          >
            <Calendar size={14} />
            Koppel Google Agenda
          </button>
          <p className="mt-3 text-xs text-[#6B7280]">
            Vereist: <code className="bg-gray-100 px-1 rounded">GOOGLE_CALENDAR_CLIENT_ID</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">GOOGLE_CALENDAR_CLIENT_SECRET</code> in .env.local
          </p>
        </Card>
      </motion.div>

      {/* Google Drive map ID */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">Google Drive — hoofdmap</h2>
          </div>
          <p className="text-sm text-[#6B7280] mb-4">
            Vul het ID in van de hoofdmap in Google Drive die je als &quot;Noah&apos;s Zorg&quot;-map wilt gebruiken.
            Het map-ID staat in de URL:{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">drive.google.com/drive/folders/<strong>MAP_ID</strong></code>
          </p>
          <DriveRootFolderSetting currentUserId={currentUserId} />

          {/* Mappenstructuur aanmaken */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Mappenstructuur aanmaken</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              Maakt automatisch de standaard mappenstructuur aan in Google Drive onder
              &quot;Noah&apos;s Zorg&quot;. Bestaande mappen worden overgeslagen. Alle map-IDs
              worden opgeslagen in de instellingen.
            </p>

            <button
              onClick={handleSetupDriveFolders}
              disabled={settingUpDrive || loadingGmail || !gmailConnected}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A7C59] text-white rounded-xl text-sm font-medium hover:bg-[#3d6a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settingUpDrive ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FolderPlus size={14} />
              )}
              {settingUpDrive ? 'Mappen aanmaken...' : 'Mappenstructuur aanmaken'}
            </button>

            {!gmailConnected && !loadingGmail && (
              <p className="mt-2 text-xs text-amber-600">
                Koppel eerst Gmail om Drive-mappen aan te maken.
              </p>
            )}

            {driveSetupError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <X size={14} className="mt-0.5 flex-shrink-0" />
                {driveSetupError}
              </div>
            )}

            {driveSetupResult && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle size={15} className="text-green-600" />
                  <span>
                    Klaar —{' '}
                    {driveSetupResult.aangemaakt > 0 && (
                      <strong>{driveSetupResult.aangemaakt} nieuw aangemaakt</strong>
                    )}
                    {driveSetupResult.aangemaakt > 0 && driveSetupResult.bestaand > 0 && ', '}
                    {driveSetupResult.bestaand > 0 && (
                      <span>{driveSetupResult.bestaand} al aanwezig</span>
                    )}
                  </span>
                </div>

                <ul className="space-y-1">
                  {driveSetupResult.folders.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <FolderOpen size={12} className="flex-shrink-0 text-[#4A7C59]" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span
                        className={`flex-shrink-0 px-1.5 py-0.5 rounded-full font-medium ${
                          f.status === 'aangemaakt'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {f.status === 'aangemaakt' ? 'Nieuw' : 'Al aanwezig'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* 2FA Beheer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.29 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#4A7C59]" />
              <h2 className="text-base font-semibold text-gray-900">Twee-staps verificatie</h2>
            </div>
            <button
              onClick={fetchMfaStatus}
              disabled={loadingMfa}
              className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-gray-900 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw size={13} className={loadingMfa ? 'animate-spin' : ''} />
              {mfaLoaded ? 'Vernieuwen' : 'Status laden'}
            </button>
          </div>
          <p className="text-sm text-[#6B7280] mb-4">
            Overzicht van alle gebruikers en of zij 2FA hebben ingesteld. Reset 2FA als iemand zijn telefoon kwijt is.
          </p>

          {!mfaLoaded ? (
            <button
              onClick={fetchMfaStatus}
              disabled={loadingMfa}
              className="flex items-center gap-2 text-sm text-[#4A7C59] hover:underline disabled:opacity-50"
            >
              {loadingMfa && <Loader2 size={14} className="animate-spin" />}
              {loadingMfa ? 'Status ophalen...' : 'Status ophalen'}
            </button>
          ) : (
            <ul className="divide-y divide-gray-100">
              {mfaUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5">
                  {/* Avatar */}
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: u.kleur ?? '#6B7280' }}
                  >
                    {u.naam.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{u.naam}</span>
                      <span className="text-xs text-[#6B7280]">{u.rol}</span>
                    </div>
                    {u.mfa_enabled && u.mfa_created_at && (
                      <p className="text-xs text-[#6B7280]">
                        Ingesteld op {new Date(u.mfa_created_at).toLocaleDateString('nl-NL')}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  {u.mfa_enabled ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 flex-shrink-0">
                      <ShieldCheck size={11} />
                      Actief
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 flex-shrink-0">
                      <ShieldOff size={11} />
                      Niet ingesteld
                    </span>
                  )}

                  {/* Reset knop */}
                  {u.mfa_enabled && u.mfa_factor_id && (
                    <button
                      onClick={() => handleMfaReset(u.id, u.mfa_factor_id!, u.naam)}
                      disabled={resettingMfa === u.id}
                      className="flex-shrink-0 text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 transition-colors"
                    >
                      {resettingMfa === u.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : mfaResetSuccess === u.id ? (
                        <span className="text-green-600">Gereset ✓</span>
                      ) : (
                        'Reset'
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>

      {/* Drive root folder instelling zit in component DriveRootFolderSetting hieronder */}
      {/* Activiteitenlog */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <AuditLog allProfiles={allProfiles} />
      </motion.div>

      {/* Notificaties overzicht */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
      >
        <NotificatieGebruikersOverzicht allProfiles={allProfiles} />
      </motion.div>

      {/* Archief */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Archive size={18} className="text-[#4A7C59]" />
            <h2 className="text-base font-semibold text-gray-900">Archief</h2>
          </div>

          {loadingArchief ? (
            <div className="animate-pulse text-sm text-[#6B7280]">Laden...</div>
          ) : archivedItems.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Geen gearchiveerde items.</p>
          ) : (
            <ul className="space-y-2">
              {archivedItems.map((item) => (
                <li
                  key={`${item.tabel}-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-[#FAFAF8] px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.label}
                      </span>
                      <span className="text-xs bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full shrink-0">
                        {item.tabel.replace('_', ' ')}
                      </span>
                    </div>
                    {item.sublabel && (
                      <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                        {item.sublabel}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={restoringId === item.id}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[#4A7C59] hover:bg-[#4A7C59]/10 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <RotateCcw size={14} />
                    {restoringId === item.id ? 'Bezig...' : 'Herstellen'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>
    </div>
  )
}

// Inline component voor Drive root folder instelling
function DriveRootFolderSetting({ currentUserId }: { currentUserId: string }) {
  const [folderId, setFolderId] = useState('')
  const [savedFolderId, setSavedFolderId] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('app_instellingen')
      .select('value')
      .eq('key', 'drive_root_folder_id')
      .single()
      .then(({ data }) => {
        if (data) {
          setFolderId((data as unknown as { value: string }).value)
          setSavedFolderId((data as unknown as { value: string }).value)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (savedFolderId) {
        await supabase.from('app_instellingen').update({ value: folderId.trim(), updated_by: currentUserId } as never).eq('key', 'drive_root_folder_id')
      } else {
        await supabase.from('app_instellingen').insert({ key: 'drive_root_folder_id', value: folderId.trim(), updated_by: currentUserId } as never)
      }
      setSavedFolderId(folderId.trim())
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <Input
        label="Map ID"
        value={folderId}
        onChange={(e) => { setFolderId(e.target.value); setSuccess(false) }}
        placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
      />
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !folderId.trim() || folderId.trim() === savedFolderId}
        >
          <span className="flex items-center gap-1.5">
            <Save size={16} />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </span>
        </Button>
        {success && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={14} />
            Opgeslagen
          </span>
        )}
        {savedFolderId && (
          <a
            href={`https://drive.google.com/drive/folders/${savedFolderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[#4A7C59] hover:underline"
          >
            <ExternalLink size={14} />
            Map openen
          </a>
        )}
      </div>
    </div>
  )
}

function NotificatieGebruikersOverzicht({ allProfiles }: { allProfiles: Profile[] }) {
  const [actieveUserIds, setActieveUserIds] = useState<string[] | null>(null)

  useEffect(() => {
    fetch('/api/notifications/users')
      .then((r) => r.json())
      .then((d) => setActieveUserIds(d.userIds ?? []))
      .catch(() => setActieveUserIds([]))
  }, [])

  const actieveGebruikers = allProfiles.filter((p) => actieveUserIds?.includes(p.id))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BellRing size={18} className="text-[#4A7C59]" />
        <h2 className="text-base font-semibold text-gray-800">Notificaties</h2>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Gebruikers die push notificaties hebben ingeschakeld via hun profielpagina.
      </p>

      {actieveUserIds === null ? (
        <p className="text-sm text-gray-400">Laden…</p>
      ) : actieveGebruikers.length === 0 ? (
        <p className="text-sm text-gray-500">Geen gebruikers hebben notificaties ingeschakeld.</p>
      ) : (
        <ul className="space-y-2">
          {actieveGebruikers.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <Bell size={14} className="text-[#4A7C59] flex-shrink-0" />
              <span className="text-sm text-gray-700">{p.naam}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
