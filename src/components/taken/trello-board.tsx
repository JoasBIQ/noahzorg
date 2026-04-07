'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, CheckSquare, Clock, Send, MessageCircle, Plus, X } from 'lucide-react'
import { DragDropContext, Draggable, type DropResult } from '@hello-pangea/dnd'
import { StrictModeDroppable } from '@/components/ui/strict-mode-droppable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { format, isPast, formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface TrelloBoardProps {
  currentUserId: string
  isBeheerder: boolean
  initialTaakTekst?: string
}

interface TrelloLabel {
  id: string
  name: string
  color: string
}

interface TrelloMember {
  id: string
  fullName: string
  avatarUrl: string | null
}

interface TrelloCard {
  id: string
  name: string
  labels: TrelloLabel[]
  idMembers: string[]
  idList: string
  due: string | null
  url: string
  desc: string
  members?: TrelloMember[]
}

interface TrelloList {
  id: string
  name: string
  cards: TrelloCard[]
}

interface TrelloComment {
  id: string
  text: string
  memberCreator: string
  date: string
}

const LABEL_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
  blue: 'bg-blue-100 text-blue-800',
  sky: 'bg-sky-100 text-sky-800',
  lime: 'bg-lime-100 text-lime-800',
  pink: 'bg-pink-100 text-pink-800',
  black: 'bg-gray-800 text-white',
}

const URGENTIE_LABELS: Record<string, string> = {
  green: 'Lage urgentie',
  yellow: 'Middel urgentie',
  red: 'Hoge urgentie',
}

function getLabelDisplay(label: TrelloLabel): string {
  if (label.name) return label.name
  return URGENTIE_LABELS[label.color] || label.color
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function MemberAvatar({ member }: { member: TrelloMember }) {
  if (member.avatarUrl) {
    return (
      <img
        src={`${member.avatarUrl}/30.png`}
        alt={member.fullName}
        title={member.fullName}
        className="w-6 h-6 rounded-full"
      />
    )
  }

  return (
    <div
      title={member.fullName}
      className="w-6 h-6 rounded-full bg-[#4A7C59] text-white text-[10px] font-bold flex items-center justify-center"
    >
      {getInitials(member.fullName)}
    </div>
  )
}

function TrelloCardItem({
  card,
  onClick,
}: {
  card: TrelloCard
  onClick: () => void
}) {
  const isOverdue = card.due ? isPast(new Date(card.due)) : false

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className="w-full text-left bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow cursor-pointer border border-gray-100 select-none"
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label) => (
            <Badge
              key={label.id}
              className={LABEL_COLORS[label.color] || 'bg-gray-100 text-gray-800'}
            >
              {getLabelDisplay(label)}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-gray-900">{card.name}</p>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {card.due && (
            <span
              className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-[#C4704F] font-medium' : 'text-[#6B7280]'
              }`}
            >
              <Clock size={12} />
              {format(new Date(card.due), 'd MMM', { locale: nl })}
            </span>
          )}
        </div>

        {card.members && card.members.length > 0 && (
          <div className="flex -space-x-1">
            {card.members.map((member) => (
              <MemberAvatar key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getCurrentUrgentie(card: TrelloCard | null): string {
  if (!card) return ''
  for (const label of card.labels) {
    if (label.color === 'green') return 'laag'
    if (label.color === 'yellow') return 'middel'
    if (label.color === 'red') return 'hoog'
  }
  return ''
}

function CardDetailModal({
  card,
  open,
  onClose,
  onUrgentieChanged,
}: {
  card: TrelloCard | null
  open: boolean
  onClose: () => void
  onUrgentieChanged?: (cardId: string, urgentie: string) => void
}) {
  const [comments, setComments] = useState<TrelloComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [urgentie, setUrgentie] = useState('')
  const [savingUrgentie, setSavingUrgentie] = useState(false)

  useEffect(() => {
    setUrgentie(getCurrentUrgentie(card))
  }, [card])

  const handleUrgentieChange = async (newUrgentie: string) => {
    if (!card || savingUrgentie) return
    setUrgentie(newUrgentie)
    setSavingUrgentie(true)
    try {
      await fetch('/api/trello/labels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, urgentie: newUrgentie || null }),
      })
      onUrgentieChanged?.(card.id, newUrgentie)
    } catch (err) {
      console.error('Urgentie bijwerken mislukt:', err)
    } finally {
      setSavingUrgentie(false)
    }
  }

  useEffect(() => {
    if (!card || !open) {
      setComments([])
      setNewComment('')
      return
    }

    const fetchComments = async () => {
      setLoadingComments(true)
      try {
        const res = await fetch(`/api/trello/comment?cardId=${card.id}`)
        const data = await res.json()
        if (data.comments) {
          setComments(data.comments)
        }
      } catch (err) {
        console.error('Comments laden mislukt:', err)
      } finally {
        setLoadingComments(false)
      }
    }

    fetchComments()
  }, [card, open])

  const handleSendComment = async () => {
    if (!card || !newComment.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/trello/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, text: newComment.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setComments((prev) => [
          {
            id: data.comment.id,
            text: newComment.trim(),
            memberCreator: 'Jij',
            date: new Date().toISOString(),
          },
          ...prev,
        ])
        setNewComment('')
      }
    } catch (err) {
      console.error('Comment plaatsen mislukt:', err)
    } finally {
      setSending(false)
    }
  }

  if (!card) return null

  const isOverdue = card.due ? isPast(new Date(card.due)) : false

  return (
    <Modal open={open} onClose={onClose} title={card.name}>
      <div className="space-y-4">
        {/* Urgentie selector */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Urgentie</h3>
          <select
            value={urgentie}
            onChange={(e) => handleUrgentieChange(e.target.value)}
            disabled={savingUrgentie}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] bg-white text-gray-700 disabled:opacity-60"
          >
            {URGENTIE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Overige labels (niet-urgentie) */}
        {card.labels.filter((l) => !['green','yellow','red'].includes(l.color)).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.labels.filter((l) => !['green','yellow','red'].includes(l.color)).map((label) => (
              <Badge
                key={label.id}
                className={LABEL_COLORS[label.color] || 'bg-gray-100 text-gray-800'}
              >
                {getLabelDisplay(label)}
              </Badge>
            ))}
          </div>
        )}

        {card.desc && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Beschrijving</h3>
            <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{card.desc}</p>
          </div>
        )}

        {card.due && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Deadline</h3>
            <span
              className={`flex items-center gap-1.5 text-sm ${
                isOverdue ? 'text-[#C4704F] font-medium' : 'text-[#6B7280]'
              }`}
            >
              <Clock size={14} />
              {format(new Date(card.due), 'd MMMM yyyy, HH:mm', { locale: nl })}
              {isOverdue && ' (verlopen)'}
            </span>
          </div>
        )}

        {card.members && card.members.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Leden</h3>
            <div className="flex flex-wrap gap-2">
              {card.members.map((member) => (
                <div key={member.id} className="flex items-center gap-1.5">
                  <MemberAvatar member={member} />
                  <span className="text-sm text-[#6B7280]">{member.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notities / Comments */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <MessageCircle size={14} />
            Notities
          </h3>

          {/* Nieuw comment */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendComment()
                }
              }}
              placeholder="Schrijf een notitie..."
              className="flex-1 text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim() || sending}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#4A7C59] text-white hover:bg-[#3d6a4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
            </button>
          </div>

          {/* Bestaande comments */}
          {loadingComments ? (
            <p className="text-xs text-[#6B7280] animate-pulse">Notities laden...</p>
          ) : comments.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{c.memberCreator}</span>
                    <span className="text-xs text-[#6B7280]">
                      {formatDistanceToNow(new Date(c.date), { addSuffix: true, locale: nl })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280]">Nog geen notities</p>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[#4A7C59] hover:underline"
          >
            <ExternalLink size={14} />
            Openen in Trello
          </a>
        </div>
      </div>
    </Modal>
  )
}

const URGENTIE_OPTIONS = [
  { value: '', label: 'Geen urgentie' },
  { value: 'laag', label: 'Lage urgentie', color: 'bg-green-100 text-green-800' },
  { value: 'middel', label: 'Middel urgentie', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hoog', label: 'Hoge urgentie', color: 'bg-red-100 text-red-800' },
]

function InlineAddCard({
  listId,
  onAdded,
  onCancel,
  initialName = '',
}: {
  listId: string
  onAdded: (card: TrelloCard) => void
  onCancel: () => void
  initialName?: string
}) {
  const [name, setName] = useState(initialName)
  const [urgentie, setUrgentie] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/trello/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), idList: listId, urgentie: urgentie || undefined }),
      })
      const data = await res.json()
      if (data.success && data.card) {
        const urgenLabel = URGENTIE_OPTIONS.find((o) => o.value === urgentie)
        onAdded({
          id: data.card.id,
          name: data.card.name,
          labels: urgentie && urgenLabel ? [{ id: `local-${urgentie}`, name: urgenLabel.label, color: urgentie === 'laag' ? 'green' : urgentie === 'middel' ? 'yellow' : 'red' }] : [],
          idMembers: [],
          idList: listId,
          due: null,
          url: data.card.url,
          desc: '',
        })
        setName('')
        setUrgentie('')
      }
    } catch (err) {
      console.error('Kaart aanmaken mislukt:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Kaartnaam..."
        autoFocus
        className="w-full text-sm rounded-md border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
      />
      <select
        value={urgentie}
        onChange={(e) => setUrgentie(e.target.value)}
        className="w-full text-xs rounded-md border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] bg-white text-gray-700"
      >
        {URGENTIE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-[#4A7C59] text-white hover:bg-[#3d6a4a] disabled:opacity-40 transition-colors"
        >
          <Plus size={12} />
          {saving ? 'Toevoegen...' : 'Toevoegen'}
        </button>
        <button
          onClick={onCancel}
          className="p-1 text-[#6B7280] hover:text-gray-900 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export function TrelloBoard({ currentUserId, isBeheerder, initialTaakTekst }: TrelloBoardProps) {
  const [lists, setLists] = useState<TrelloList[]>([])
  const [boardUrl, setBoardUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [selectedCard, setSelectedCard] = useState<TrelloCard | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [addingToList, setAddingToList] = useState<string | null>(null)
  const [prefillTekst, setPrefillTekst] = useState<string | undefined>(initialTaakTekst)
  const didAutoOpen = useRef(false)

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/trello/board')
      const data = await res.json()

      if (data.error) {
        setDebugInfo(`API fout: ${data.error}`)
      }

      if (data.configured) {
        setLists(data.lists || [])
        setBoardUrl(data.boardUrl || '')
        setConfigured(true)
        if (data.error) {
          setDebugInfo(`Trello fout: ${data.error}`)
        } else if (data.lists?.length === 0) {
          setDebugInfo('Bord gekoppeld maar geen lijsten gevonden. Controleer het Bord ID.')
        } else {
          setDebugInfo(null)
        }
      } else {
        setConfigured(false)
        setDebugInfo(`Niet geconfigureerd. Response: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      console.error('[Trello] Fetch error:', err)
      setConfigured(false)
      setDebugInfo(`Fetch fout: ${String(err)}`)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await fetchBoard()
      setLoading(false)
    }
    init()
  }, [fetchBoard])

  useEffect(() => {
    if (!configured) return
    const interval = setInterval(fetchBoard, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [configured, fetchBoard])

  // Auto-open "Inbox" (of eerste lijst) als er een vooringevulde taaktekst is
  useEffect(() => {
    if (!prefillTekst || !configured || lists.length === 0 || didAutoOpen.current) return
    didAutoOpen.current = true
    const inboxList =
      lists.find((l) => l.name.toLowerCase() === 'inbox') ?? lists[0]
    if (inboxList) {
      setAddingToList(inboxList.id)
    }
  }, [prefillTekst, configured, lists])

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, source, destination } = result

    console.log('[Trello DnD] drag end:', { draggableId, source, destination })

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    console.log('[Trello DnD] Moving card', draggableId, 'from list', source.droppableId, 'to list', destination.droppableId)

    // Optimistic update
    const newLists = lists.map((list) => ({
      ...list,
      cards: [...list.cards],
    }))

    const sourceList = newLists.find((l) => l.id === source.droppableId)
    const destList = newLists.find((l) => l.id === destination.droppableId)

    if (!sourceList || !destList) return

    const [movedCard] = sourceList.cards.splice(source.index, 1)
    movedCard.idList = destination.droppableId
    destList.cards.splice(destination.index, 0, movedCard)

    setLists(newLists)

    // Sync with Trello
    try {
      console.log('[Trello DnD] Sending PATCH:', { cardId: draggableId, idList: destination.droppableId })
      const res = await fetch('/api/trello/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: draggableId, idList: destination.droppableId }),
      })

      const data = await res.json()
      console.log('[Trello DnD] PATCH response:', res.status, data)

      if (!res.ok || !data.success) {
        console.error('[Trello DnD] Verplaatsen mislukt:', data.error)
        setDebugInfo(`Verplaatsen mislukt: ${data.error || 'Onbekende fout'}`)
        // Revert: haal originele staat op
        await fetchBoard()
      } else {
        console.log('[Trello DnD] Succes! Kaart verplaatst.')
        // Optimistic update is al correct, geen refetch nodig
        setDebugInfo(null)
      }
    } catch (err) {
      console.error('[Trello DnD] Fout:', err)
      setDebugInfo(`Verplaatsen mislukt: ${String(err)}`)
      await fetchBoard()
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted">Laden...</div>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center py-16 lg:py-24"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4A7C59]/10 mb-6">
            <CheckSquare className="h-8 w-8 text-[#4A7C59]" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Taken</h1>

          <p className="text-[#6B7280] max-w-md mb-8">
            Taken worden beheerd in Trello. Koppel het Trello-bord via de API in Beheer om kaarten hier te tonen.
          </p>

          <div className="space-y-3 text-center">
            <p className="text-sm text-[#C4704F]">
              Er is nog geen Trello-bord gekoppeld.
            </p>
            {isBeheerder && (
              <p className="text-sm text-[#6B7280]">
                Ga naar Beheer om de Trello API-koppeling in te stellen.
              </p>
            )}
            {debugInfo && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-left max-w-md mx-auto break-all">
                {debugInfo}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taken</h1>
          {isBeheerder && (
            <p className="text-xs text-[#6B7280] mt-0.5">Taken worden gesynchroniseerd met Trello</p>
          )}
        </div>
        <button
          onClick={() => window.open(boardUrl, '_blank')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ExternalLink size={14} />
          Open in Trello
        </button>
      </motion.div>

      {debugInfo && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {debugInfo}
        </div>
      )}

      {/* Kanban Board with DnD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 overflow-x-auto pb-4"
        >
          <div className="flex gap-4 min-h-0">
            {lists.map((list, index) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 rounded-xl p-3 min-w-[280px] max-w-[320px] flex-shrink-0 flex flex-col"
              >
                <h2 className="text-sm font-semibold text-gray-700 px-1 mb-3">
                  {list.name}
                  <span className="ml-2 text-xs font-normal text-[#6B7280]">
                    {list.cards.length}
                  </span>
                </h2>

                <StrictModeDroppable droppableId={list.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 flex-1 min-h-[48px] rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-[#4A7C59]/5' : ''
                      }`}
                    >
                      {list.cards.map((card, cardIndex) => (
                        <Draggable key={card.id} draggableId={card.id} index={cardIndex}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`${dragSnapshot.isDragging ? 'rotate-2 shadow-lg' : ''} transition-transform`}
                            >
                              <TrelloCardItem
                                card={card}
                                onClick={() => !dragSnapshot.isDragging && setSelectedCard(card)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {list.cards.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-[#6B7280] text-center py-4">
                          Geen kaarten
                        </p>
                      )}
                    </div>
                  )}
                </StrictModeDroppable>

                {/* Inline add card */}
                {addingToList === list.id ? (
                  <div className="mt-2">
                    <InlineAddCard
                      listId={list.id}
                      initialName={addingToList === list.id ? (prefillTekst ?? '') : ''}
                      onAdded={(card) => {
                        setLists((prev) =>
                          prev.map((l) =>
                            l.id === list.id
                              ? { ...l, cards: [...l.cards, card] }
                              : l
                          )
                        )
                        setPrefillTekst(undefined)
                        setAddingToList(null)
                      }}
                      onCancel={() => {
                        setPrefillTekst(undefined)
                        setAddingToList(null)
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToList(list.id)}
                    className="mt-2 flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium text-[#6B7280] hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Kaart toevoegen
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </DragDropContext>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUrgentieChanged={(cardId, newUrgentie) => {
          const URGENTIE_LABEL_MAP: Record<string, { color: string; naam: string }> = {
            laag: { color: 'green', naam: 'Lage urgentie' },
            middel: { color: 'yellow', naam: 'Middel urgentie' },
            hoog: { color: 'red', naam: 'Hoge urgentie' },
          }
          setLists((prev) =>
            prev.map((list) => ({
              ...list,
              cards: list.cards.map((c) => {
                if (c.id !== cardId) return c
                const nonUrgentieLabels = c.labels.filter(
                  (l) => !['green', 'yellow', 'red'].includes(l.color)
                )
                const urgentieLabel = newUrgentie && URGENTIE_LABEL_MAP[newUrgentie]
                  ? [{ id: `urgentie-${newUrgentie}`, color: URGENTIE_LABEL_MAP[newUrgentie].color, name: URGENTIE_LABEL_MAP[newUrgentie].naam }]
                  : []
                return { ...c, labels: [...nonUrgentieLabels, ...urgentieLabel] }
              }),
            }))
          )
          if (selectedCard?.id === cardId) {
            setSelectedCard((prev) => {
              if (!prev) return prev
              const nonUrgentieLabels = prev.labels.filter(
                (l) => !['green', 'yellow', 'red'].includes(l.color)
              )
              const urgentieLabel = newUrgentie && URGENTIE_LABEL_MAP[newUrgentie]
                ? [{ id: `urgentie-${newUrgentie}`, color: URGENTIE_LABEL_MAP[newUrgentie].color, name: URGENTIE_LABEL_MAP[newUrgentie].naam }]
                : []
              return { ...prev, labels: [...nonUrgentieLabels, ...urgentieLabel] }
            })
          }
        }}
      />
    </div>
  )
}
