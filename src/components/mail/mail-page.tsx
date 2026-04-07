'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  RefreshCw,
  ExternalLink,
  Send,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Reply,
  Inbox,
  SendHorizonal,
  FileText,
  Search,
  X,
  Loader2,
  PenSquare,
  CalendarPlus,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/empty-state'
import { Avatar } from '@/components/ui/avatar'
import type { Profile } from '@/types'

type MailTab = 'INBOX' | 'SENT' | 'DRAFT'

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  body: string
  labelIds: string[]
  gelezen: boolean
}

interface MailReactie {
  id: string
  gmail_message_id: string
  auteur_id: string
  bericht: string
  created_at: string
  profiles: {
    naam: string
    kleur: string
  }
}

interface MailPageProps {
  isBeheerder: boolean
  currentProfile: Profile
  initialConnected: boolean
  gmailEmail?: string | null
  initialSchrijf?: boolean
}

function parseFrom(from: string): { naam: string; email: string } {
  const match = from.match(/^"?([^"<]+?)"?\s*<([^>]+)>$/)
  if (match) {
    return { naam: match[1].trim(), email: match[2].trim() }
  }
  return { naam: from, email: from }
}

function MailDiscussion({
  messageId,
  currentProfile,
}: {
  messageId: string
  currentProfile: Profile
}) {
  const [reacties, setReacties] = useState<MailReactie[]>([])
  const [loading, setLoading] = useState(true)
  const [nieuw, setNieuw] = useState('')
  const [sending, setSending] = useState(false)

  const fetchReacties = useCallback(async () => {
    const res = await fetch(`/api/gmail/reacties?messageId=${messageId}`)
    const data = await res.json()
    setReacties(data.reacties ?? [])
    setLoading(false)
  }, [messageId])

  useEffect(() => {
    fetchReacties()
  }, [fetchReacties])

  const handleSend = async () => {
    if (!nieuw.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/gmail/reacties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, bericht: nieuw.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setReacties((prev) => [...prev, data.reactie])
        setNieuw('')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <MessageCircle size={12} />
        Overleg
      </h4>

      {loading ? (
        <p className="text-xs text-[#6B7280] animate-pulse">Laden...</p>
      ) : reacties.length > 0 ? (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {reacties.map((r) => (
            <div key={r.id} className="flex items-start gap-2">
              <Avatar
                naam={r.profiles?.naam ?? 'Onbekend'}
                kleur={r.profiles?.kleur ?? '#6B7280'}
                size="sm"
              />
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-gray-700">
                    {r.profiles?.naam ?? 'Onbekend'}
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: nl })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.bericht}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#6B7280] mb-3">
          Nog geen reacties — schrijf als eerste.
        </p>
      )}

      <div className="flex gap-2">
        <Avatar naam={currentProfile.naam} kleur={currentProfile.kleur} size="sm" />
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Schrijf een reactie..."
            className="flex-1 text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
          />
          <button
            onClick={handleSend}
            disabled={!nieuw.trim() || sending}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#4A7C59] text-white hover:bg-[#3d6a4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

const MAANDEN: Record<string, number> = {
  januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6,
  juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12,
}

function extractDateFromText(text: string): string | null {
  const pad = (n: number) => n.toString().padStart(2, '0')

  // Datum: "14 april" of "14 april 2026"
  const datumRe = /(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)(?:\s+(\d{4}))?/i
  const datumMatch = text.match(datumRe)
  if (!datumMatch) return null

  const dag = parseInt(datumMatch[1])
  const maand = MAANDEN[datumMatch[2].toLowerCase()]
  const jaar = datumMatch[3] ? parseInt(datumMatch[3]) : new Date().getFullYear()

  // Tijd: "14:00", "14.00", "om 14:00", "14:30 uur"
  const tijdRe = /(?:om\s+)?(\d{1,2})[.:](\d{2})(?:\s*uur)?/gi
  let uur = 10
  let minuut = 0
  let tijdMatch: RegExpExecArray | null
  while ((tijdMatch = tijdRe.exec(text)) !== null) {
    const h = parseInt(tijdMatch[1])
    const m = parseInt(tijdMatch[2])
    if (h >= 6 && h <= 22 && m >= 0 && m <= 59) {
      uur = h
      minuut = m
      break
    }
  }

  return `${jaar}-${pad(maand)}-${pad(dag)}T${pad(uur)}:${pad(minuut)}`
}

function MailItem({
  message,
  tab,
  currentProfile,
  heeftOngelezen = false,
  onOverlegGelezen,
  onRemove,
}: {
  message: GmailMessage
  tab: MailTab
  currentProfile: Profile
  heeftOngelezen?: boolean
  onOverlegGelezen?: () => void
  onRemove?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showDiscussion, setShowDiscussion] = useState(false)
  const [gelezen, setGelezen] = useState(message.gelezen)
  const [localOngelezen, setLocalOngelezen] = useState(heeftOngelezen)
  const [showOverlegModal, setShowOverlegModal] = useState(false)
  const [overlegTitel, setOverlegTitel] = useState('')
  const [overlegDatum, setOverlegDatum] = useState('')
  const [overlegAanwezigen, setOverlegAanwezigen] = useState('')
  const [overlegNotities, setOverlegNotities] = useState('')
  const [overlegType, setOverlegType] = useState<'fysiek' | 'online' | 'telefoon'>('fysiek')
  const [overlegLocatie, setOverlegLocatie] = useState('')
  const [datumHerkend, setDatumHerkend] = useState(false)
  const [savingOverleg, setSavingOverleg] = useState(false)
  const [overlegAangemaakt, setOverlegAangemaakt] = useState(false)
  const [trashingMail, setTrashingMail] = useState(false)
  // Reply modal
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyCc, setReplyCc] = useState('familie.noahdeinum@gmail.com')
  const [replyBericht, setReplyBericht] = useState('')
  const [showQuote, setShowQuote] = useState(false)
  const [replySending, setReplySending] = useState(false)
  const [replySent, setReplySent] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    setLocalOngelezen(heeftOngelezen)
  }, [heeftOngelezen])

  const isDraft = tab === 'DRAFT'
  const isSent = tab === 'SENT'
  // Ongelezen = inbox-bericht dat deze gebruiker nog niet heeft geopend
  const isUnread = tab === 'INBOX' && !gelezen

  const handleToggle = async () => {
    const wasOpen = open
    setOpen(!wasOpen)
    // Markeer als gelezen bij eerste openen (alleen inbox)
    if (!wasOpen && !gelezen && tab === 'INBOX') {
      setGelezen(true)
      await fetch('/api/mail/leestatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id }),
      })
    }
  }

  const handleOpenOverlegModal = () => {
    setOverlegTitel(message.subject)
    setOverlegAanwezigen('')
    setOverlegNotities(message.snippet || '')
    setOverlegType('fysiek')
    setOverlegLocatie('')
    setOverlegAangemaakt(false)

    // Probeer datum/tijd te herkennen uit de mailinhoud
    const tekst = (message.body || message.snippet || '') + ' ' + message.subject
    const extracted = extractDateFromText(tekst)
    setOverlegDatum(extracted ?? '')
    setDatumHerkend(!!extracted)
    setShowOverlegModal(true)
  }

  const handleSaveOverleg = async () => {
    if (!overlegTitel.trim() || !overlegDatum) return
    setSavingOverleg(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('overleggen').insert({
        titel: overlegTitel.trim(),
        datum_tijd: new Date(overlegDatum).toISOString(),
        aanwezigen: [],
        aanwezigen_tekst: overlegAanwezigen.trim() || null,
        notities: overlegNotities.trim() || null,
        bron: 'mail',
        aangemaakt_door: currentProfile.id,
        type_overleg: overlegType,
        locatie: overlegLocatie.trim() || null,
      } as never)
      setOverlegAangemaakt(true)
    } catch {
      // silent fail
    } finally {
      setSavingOverleg(false)
    }
  }

  const handleTrashMail = async () => {
    setTrashingMail(true)
    try {
      await fetch('/api/gmail/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id }),
      })
      setShowOverlegModal(false)
      onRemove?.(message.id)
    } finally {
      setTrashingMail(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyBericht.trim()) return
    setReplySending(true)
    setReplyError(null)

    const { email: senderEmail } = parseFrom(message.from)
    const replyOnderwerp = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`

    // Geciteerde tekst toevoegen als de gebruiker de quote open heeft staan
    const citaat = showQuote
      ? `\n\n--- Oorspronkelijk bericht ---\nVan: ${message.from}\nDatum: ${message.date}\n\n${message.body || message.snippet}`
      : ''
    const volledigBericht = replyBericht + citaat

    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aan: senderEmail,
        onderwerp: replyOnderwerp,
        bericht: volledigBericht,
        cc: replyCc.trim() || undefined,
        // Gmail threadId zodat de reply in de juiste thread komt
        threadId: message.threadId,
      }),
    })

    setReplySending(false)

    if (!res.ok) {
      const data = await res.json()
      setReplyError(data.error === 'token_expired' ? 'Gmail sessie verlopen. Koppel Gmail opnieuw via Beheer.' : (data.error || 'Verzenden mislukt.'))
      return
    }

    setReplySent(true)
    setTimeout(() => {
      setShowReplyModal(false)
      setReplyBericht('')
      setReplySent(false)
      setShowQuote(false)
    }, 1500)
  }

  // Verzonden: toon ontvanger (To-header), Inbox: toon afzender, Concept: geen afzender
  const displayName = isDraft
    ? null
    : isSent
    ? parseFrom(message.to || message.from).naam
    : parseFrom(message.from).naam

  const { email: senderEmail } = parseFrom(message.from)
  const replyHref = `mailto:${senderEmail}?subject=Re: ${encodeURIComponent(message.subject)}`

  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : '?'

  return (
    <div
      className={`bg-white rounded-xl border transition-colors ${
        isUnread ? 'border-[#4A7C59]/30 shadow-sm' :
        localOngelezen ? 'border-orange-300 shadow-md shadow-orange-100' :
        'border-gray-200'
      } overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: isDraft ? '#9CA3AF' : '#4A7C59' }}
        >
          {isDraft ? <FileText size={16} /> : avatarLetter}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isUnread && (
                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-[#4A7C59]" />
              )}
              {displayName && (
                <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {isSent ? `Aan: ${displayName}` : displayName}
                </span>
              )}
              {isDraft && (
                <span className="text-sm font-medium text-amber-600">Concept</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {localOngelezen && (
                <span className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                  <MessageCircle size={11} />
                  Nieuw overleg
                </span>
              )}
              <span className="text-xs text-[#6B7280] mt-0.5">{message.date.slice(0, 16)}</span>
            </div>
          </div>
          <p className={`text-sm truncate ${isUnread ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
            {message.subject}
          </p>
          {!open && (
            <p className="text-xs text-[#6B7280] truncate mt-0.5">{message.snippet}</p>
          )}
        </div>

        <span className="text-[#6B7280] flex-shrink-0 mt-1">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Uitklapbaar lichaam */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-3 font-mono text-xs leading-relaxed">
                {message.body || message.snippet}
              </div>

              {/* Acties — alleen bij Inbox */}
              {!isDraft && (
                <div className="flex items-center gap-3 mt-3">
                  {!isSent && (
                    <button
                      onClick={() => { setShowReplyModal(true); setReplySent(false); setReplyError(null) }}
                      className="flex items-center gap-1.5 text-xs text-[#4A7C59] hover:underline font-medium"
                    >
                      <Reply size={14} />
                      Beantwoorden
                    </button>
                  )}

                  {tab === 'INBOX' && (
                    <button
                      onClick={async () => {
                        const opening = !showDiscussion
                        setShowDiscussion(opening)
                        if (opening && localOngelezen) {
                          setLocalOngelezen(false)
                          onOverlegGelezen?.()
                          await fetch('/api/mail/reacties-leestatus', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messageId: message.id }),
                          })
                        }
                      }}
                      className="relative flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-gray-900 transition-colors ml-2"
                    >
                      <span className="relative">
                        <MessageCircle size={14} />
                        {localOngelezen && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500" />
                        )}
                      </span>
                      {showDiscussion ? 'Overleg verbergen' : 'Overleg'}
                    </button>
                  )}
                  {tab === 'INBOX' && (
                    <button
                      onClick={handleOpenOverlegModal}
                      className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#4A7C59] transition-colors"
                    >
                      <CalendarPlus size={14} />
                      {overlegAangemaakt ? 'Aangemaakt!' : 'Maak overleg aan'}
                    </button>
                  )}
                </div>
              )}

              {/* Overleg — alleen Inbox */}
              {tab === 'INBOX' && showDiscussion && (
                <MailDiscussion
                  messageId={message.id}
                  currentProfile={currentProfile}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overleg aanmaken modal */}
      {showOverlegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowOverlegModal(false); setOverlegAangemaakt(false) }} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900">Overleg aanmaken</h2>
              <button onClick={() => { setShowOverlegModal(false); setOverlegAangemaakt(false) }} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {overlegAangemaakt ? (
              /* Bevestiging na opslaan */
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#4A7C59]/10 flex items-center justify-center mx-auto">
                  <CalendarPlus size={22} className="text-[#4A7C59]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Overleg aangemaakt!</p>
                  <p className="text-sm text-[#6B7280] mt-1">Wat wil je doen met deze mail?</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleTrashMail}
                    disabled={trashingMail}
                    className="flex-1 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {trashingMail ? 'Bezig...' : 'Verwijder mail'}
                  </button>
                  <button
                    onClick={() => { setShowOverlegModal(false); setOverlegAangemaakt(false) }}
                    className="flex-1 py-2.5 rounded-xl bg-[#4A7C59] text-white text-sm font-medium hover:bg-[#3d6a4a] transition-colors"
                  >
                    Bewaar mail
                  </button>
                </div>
              </div>
            ) : (
              /* Formulier */
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Titel</label>
                  <input
                    type="text"
                    value={overlegTitel}
                    onChange={(e) => setOverlegTitel(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Datum en tijd</label>
                  <input
                    type="datetime-local"
                    value={overlegDatum}
                    onChange={(e) => { setOverlegDatum(e.target.value); setDatumHerkend(false) }}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
                  />
                  {datumHerkend && (
                    <p className="text-xs text-[#4A7C59] mt-1 flex items-center gap-1">
                      <span>✓</span> Datum herkend uit mail
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
                  <div className="flex gap-2">
                    {(['fysiek', 'online', 'telefoon'] as const).map((type) => (
                      <label key={type} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                        overlegType === type
                          ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#4A7C59]'
                          : 'border-gray-200 text-[#6B7280] hover:bg-gray-50'
                      }`}>
                        <input type="radio" name="overlegType" value={type} checked={overlegType === type} onChange={() => setOverlegType(type)} className="sr-only" />
                        {type === 'fysiek' ? '📍' : type === 'online' ? '💻' : '📞'}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {overlegType === 'fysiek' ? 'Locatie' : overlegType === 'online' ? 'Meeting link' : 'Telefoonnummer'}
                  </label>
                  <input
                    type={overlegType === 'online' ? 'url' : 'text'}
                    value={overlegLocatie}
                    onChange={(e) => setOverlegLocatie(e.target.value)}
                    placeholder={
                      overlegType === 'fysiek' ? 'Adres of locatie' :
                      overlegType === 'online' ? 'Meeting link (Teams, Zoom etc.)' :
                      'Telefoonnummer'
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Aanwezigen</label>
                  <input
                    type="text"
                    value={overlegAanwezigen}
                    onChange={(e) => setOverlegAanwezigen(e.target.value)}
                    placeholder="Bijv. Mama, Papa, Begeleider..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notities</label>
                  <textarea
                    value={overlegNotities}
                    onChange={(e) => setOverlegNotities(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowOverlegModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#6B7280] hover:bg-gray-50 transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleSaveOverleg}
                    disabled={savingOverleg || !overlegTitel.trim() || !overlegDatum}
                    className="flex-1 py-2.5 rounded-xl bg-[#4A7C59] text-white text-sm font-medium hover:bg-[#3d6a4a] transition-colors disabled:opacity-50"
                  >
                    {savingOverleg ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reply modal */}
      {showReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReplyModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Reply size={16} className="text-[#4A7C59]" />
                Beantwoorden
              </h2>
              <button onClick={() => setShowReplyModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {replySent ? (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-[#4A7C59]/10 flex items-center justify-center">
                  <Reply size={22} className="text-[#4A7C59]" />
                </div>
                <p className="font-semibold text-gray-900">Mail verstuurd!</p>
                <p className="text-sm text-[#6B7280]">Je reactie is verstuurd en verschijnt in Verzonden.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Aan (niet aanpasbaar) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Aan</label>
                  <div className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                    {parseFrom(message.from).email}
                  </div>
                </div>

                {/* CC */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CC</label>
                  <input
                    type="text"
                    value={replyCc}
                    onChange={(e) => setReplyCc(e.target.value)}
                    placeholder="optioneel cc-adres"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
                  />
                </div>

                {/* Onderwerp (niet aanpasbaar) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Onderwerp</label>
                  <div className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                    {message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`}
                  </div>
                </div>

                {/* Bericht */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bericht</label>
                  <textarea
                    value={replyBericht}
                    onChange={(e) => setReplyBericht(e.target.value)}
                    rows={6}
                    autoFocus
                    placeholder="Schrijf je reactie..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors resize-none"
                  />
                </div>

                {/* Geciteerde mail (inklapbaar) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowQuote((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-gray-900 transition-colors"
                  >
                    <ChevronDown size={13} className={`transition-transform ${showQuote ? 'rotate-180' : ''}`} />
                    {showQuote ? 'Verberg geciteerde mail' : 'Toon geciteerde mail'}
                  </button>
                  {showQuote && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono leading-relaxed">
                      <p className="font-sans font-medium text-gray-600 mb-1">Van: {message.from} · {message.date.slice(0, 16)}</p>
                      {message.body || message.snippet}
                    </div>
                  )}
                </div>

                {replyError && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <span className="flex-shrink-0 mt-0.5">⚠</span>
                    {replyError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowReplyModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={replySending || !replyBericht.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4A7C59] text-white text-sm font-medium hover:bg-[#3d6a4a] transition-colors disabled:opacity-50"
                  >
                    {replySending
                      ? <><Loader2 size={14} className="animate-spin" /> Versturen...</>
                      : <><SendHorizonal size={14} /> Versturen</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABS: { id: MailTab; label: string; icon: React.ComponentType<any>; emptyTitle: string; emptyDesc: string }[] = [
  {
    id: 'INBOX',
    label: 'Inbox',
    icon: Inbox,
    emptyTitle: 'Geen berichten',
    emptyDesc: 'Er zijn geen berichten in de inbox gevonden.',
  },
  {
    id: 'SENT',
    label: 'Verzonden',
    icon: SendHorizonal,
    emptyTitle: 'Geen verzonden mail',
    emptyDesc: 'Er zijn geen verzonden berichten gevonden.',
  },
  {
    id: 'DRAFT',
    label: 'Concepten',
    icon: FileText,
    emptyTitle: 'Geen concepten',
    emptyDesc: 'Er zijn geen concepten gevonden.',
  },
]

export function MailPage({ isBeheerder, currentProfile, initialConnected, gmailEmail, initialSchrijf = false }: MailPageProps) {
  const [activeTab, setActiveTab] = useState<MailTab>('INBOX')
  const [messagesByTab, setMessagesByTab] = useState<Record<MailTab, GmailMessage[]>>({
    INBOX: [],
    SENT: [],
    DRAFT: [],
  })
  const [loadingTab, setLoadingTab] = useState<MailTab | null>(initialConnected ? 'INBOX' : null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connected = initialConnected

  // Ongelezen overleg-reacties per bericht
  const [ongelezenOverleg, setOngelezenOverleg] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!initialConnected) return
    fetch('/api/mail/reacties-leestatus')
      .then((r) => r.json())
      .then((data) => {
        if (data.messageIds) setOngelezenOverleg(new Set(data.messageIds as string[]))
      })
      .catch(() => {})
  }, [initialConnected])

  // Schrijf mail
  const [showSchrijfModal, setShowSchrijfModal] = useState(initialSchrijf)
  const [schrijfAan, setSchrijfAan] = useState('')
  const [schrijfOnderwerp, setSchrijfOnderwerp] = useState('')
  const [schrijfBericht, setSchrijfBericht] = useState('')
  const [verzenden, setVerzenden] = useState(false)
  const [verzendFout, setVerzendFout] = useState<string | null>(null)
  const [verzendSucces, setVerzendSucces] = useState(false)

  // Zoeken
  const [searchInput, setSearchInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GmailMessage[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTab = useCallback(async (tab: MailTab, isRefresh = false) => {
    if (!isRefresh) setLoadingTab(tab)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`/api/gmail/messages?maxResults=25&label=${tab}`)
      const data = await res.json()
      if (data.error === 'token_expired') {
        setError('Gmail koppeling verlopen. Koppel opnieuw via Beheer.')
      } else if (data.error) {
        setError(data.error)
      } else {
        setMessagesByTab((prev) => ({ ...prev, [tab]: data.messages ?? [] }))
      }
    } catch {
      setError('Berichten ophalen mislukt.')
    } finally {
      setLoadingTab(null)
      setRefreshing(false)
    }
  }, [])

  const handleVerzenden = async () => {
    if (!schrijfAan.trim() || !schrijfBericht.trim() || verzenden) return
    setVerzenden(true)
    setVerzendFout(null)
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aan: schrijfAan.trim(),
          onderwerp: schrijfOnderwerp.trim(),
          bericht: schrijfBericht.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVerzendFout(data.error ?? 'Verzenden mislukt. Probeer het opnieuw.')
      } else {
        setShowSchrijfModal(false)
        setSchrijfAan('')
        setSchrijfOnderwerp('')
        setSchrijfBericht('')
        setVerzendFout(null)
        setVerzendSucces(true)
        setTimeout(() => setVerzendSucces(false), 4000)
      }
    } catch {
      setVerzendFout('Netwerk fout. Controleer je verbinding.')
    } finally {
      setVerzenden(false)
    }
  }

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setSearchResults(null)
      setActiveQuery('')
      return
    }
    setSearching(true)
    setSearchError(null)
    setActiveQuery(trimmed)
    setSearchResults([]) // toon zoekpaneel direct zodat laad-indicator zichtbaar is
    const url = `/api/gmail/messages?maxResults=25&q=${encodeURIComponent(trimmed)}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.error === 'token_expired') {
        setSearchError('Gmail koppeling verlopen. Koppel opnieuw via Beheer.')
        setSearchResults([])
      } else if (data.error) {
        setSearchError(data.error)
        setSearchResults([])
      } else {
        setSearchResults(data.messages ?? [])
      }
    } catch {
      setSearchError('Zoeken mislukt.')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setSearchInput('')
    setActiveQuery('')
    setSearchResults(null)
    setSearchError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      clearSearch()
      return
    }
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => runSearch(value), 400)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      runSearch(searchInput)
    }
    if (e.key === 'Escape') clearSearch()
  }

  // Laad actief tabblad als het nog niet geladen is
  useEffect(() => {
    if (!initialConnected) return
    fetchTab(activeTab)
  }, [activeTab, initialConnected, fetchTab])

  if (!connected) {
    return (
      <div className="p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center py-16"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4A7C59]/10 mb-6">
            <Mail className="h-8 w-8 text-[#4A7C59]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mail</h1>
          <p className="text-[#6B7280] max-w-md mb-6">
            Verbind het Gmail-account om e-mails over Noah hier te lezen en samen te bespreken met de familie.
          </p>
          {isBeheerder ? (
            <a
              href="/api/gmail/auth"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A7C59] text-white rounded-xl font-medium hover:bg-[#3d6a4a] transition-colors"
            >
              <ExternalLink size={16} />
              Gmail koppelen
            </a>
          ) : (
            <p className="text-sm text-[#6B7280]">
              Vraag de beheerder om Gmail te koppelen via Beheer.
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  const currentTab = TABS.find((t) => t.id === activeTab)!
  const messages = messagesByTab[activeTab]
  const isLoading = loadingTab === activeTab

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mail</h1>
          {gmailEmail && (
            <p className="text-sm text-[#6B7280] mt-0.5">{gmailEmail}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSchrijfModal(true)}
            className="flex items-center gap-1.5 text-sm text-white bg-[#4A7C59] hover:bg-[#3d6a4a] transition-colors px-3 py-2 rounded-lg font-medium"
          >
            <PenSquare size={15} />
            <span className="hidden sm:inline">Schrijf mail</span>
          </button>
          <button
            onClick={() => fetchTab(activeTab, true)}
            disabled={refreshing || isLoading}
            className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Vernieuwen</span>
          </button>
        </div>
      </div>

      {/* Mail verstuurd melding */}
      {verzendSucces && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-[#4A7C59] text-white px-5 py-3 rounded-full shadow-lg text-sm font-medium animate-fade-in">
          <Send size={15} />
          Mail verstuurd
        </div>
      )}

      {/* Schrijf mail modal */}
      {showSchrijfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSchrijfModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Nieuwe mail</h2>
              <button onClick={() => setShowSchrijfModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {gmailEmail && (
                <div className="flex items-center gap-2 bg-[#4A7C59]/8 border border-[#4A7C59]/20 rounded-lg px-3 py-2 text-sm text-[#4A7C59]">
                  <Mail size={14} className="flex-shrink-0" />
                  <span>Verzenden vanuit: <strong>{gmailEmail}</strong></span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aan</label>
                <input
                  type="email"
                  value={schrijfAan}
                  onChange={(e) => setSchrijfAan(e.target.value)}
                  placeholder="ontvanger@email.nl"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onderwerp</label>
                <input
                  type="text"
                  value={schrijfOnderwerp}
                  onChange={(e) => setSchrijfOnderwerp(e.target.value)}
                  placeholder="Onderwerp"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bericht</label>
                <textarea
                  value={schrijfBericht}
                  onChange={(e) => setSchrijfBericht(e.target.value)}
                  placeholder="Schrijf je bericht hier..."
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors resize-none"
                />
              </div>
              {verzendFout && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                  {verzendFout}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowSchrijfModal(false); setVerzendFout(null) }}
                  disabled={verzenden}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#6B7280] hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleVerzenden}
                  disabled={verzenden || !schrijfAan.trim() || !schrijfBericht.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4A7C59] text-white text-sm font-medium hover:bg-[#3d6a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verzenden ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Verzenden...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Verzenden
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoekbalk */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Zoek op afzender, onderwerp of inhoud..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20 focus:border-[#4A7C59] transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {searching && (
            <Loader2 size={15} className="animate-spin text-[#4A7C59]" />
          )}
          {searchInput && !searching && (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Zoekopdracht wissen"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Tabbladen — verborgen tijdens actieve zoekresultaten */}
      {!searchResults && (
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-[#4A7C59] text-[#4A7C59]'
                    : 'border-transparent text-[#6B7280] hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Zoekresultaten */}
      {searchResults !== null ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-sm text-[#6B7280]">
              {searching
                ? `Zoeken naar "${activeQuery}"...`
                : `${searchResults.length} resultaat${searchResults.length !== 1 ? 'en' : ''} voor "${activeQuery}"`}
            </p>
            <button
              onClick={clearSearch}
              className="text-xs text-[#4A7C59] hover:underline ml-auto"
            >
              Zoekopdracht wissen
            </button>
          </div>

          {searchError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {searchError}
            </div>
          )}

          {searching ? (
            <div className="flex items-center justify-center py-16 gap-2 text-[#6B7280]">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Zoeken...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Geen resultaten"
              description={`Geen berichten gevonden voor "${activeQuery}".`}
            />
          ) : (
            <motion.div
              key={`search-${activeQuery}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {searchResults.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <MailItem
                    message={message}
                    tab={message.labelIds.includes('SENT') ? 'SENT' : message.labelIds.includes('DRAFT') ? 'DRAFT' : 'INBOX'}
                    currentProfile={currentProfile}
                    heeftOngelezen={ongelezenOverleg.has(message.id)}
                    onOverlegGelezen={() => setOngelezenOverleg((prev) => { const next = new Set(prev); next.delete(message.id); return next })}
                    onRemove={(id) => setMessagesByTab((prev) => ({ ...prev, [activeTab]: prev[activeTab].filter((m) => m.id !== id) }))}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-pulse text-[#6B7280] text-sm">Laden...</div>
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={currentTab.icon}
              title={currentTab.emptyTitle}
              description={currentTab.emptyDesc}
            />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <MailItem
                    message={message}
                    tab={activeTab}
                    currentProfile={currentProfile}
                    heeftOngelezen={ongelezenOverleg.has(message.id)}
                    onOverlegGelezen={() => setOngelezenOverleg((prev) => { const next = new Set(prev); next.delete(message.id); return next })}
                    onRemove={(id) => setMessagesByTab((prev) => ({ ...prev, [activeTab]: prev[activeTab].filter((m) => m.id !== id) }))}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
