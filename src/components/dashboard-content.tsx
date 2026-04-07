'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar,
  BookOpen,
  ChevronRight,
  Clock,
  MapPin,
  PenLine,
  CheckSquare,
  Mail,
  Users,
  MessageSquare,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import {
  getGreeting,
  formatDate,
  formatTime,
  formatRelative,
} from '@/lib/utils'
import {
  AGENDA_TYPE_LABELS,
  AGENDA_TYPE_COLORS,
  CATEGORIE_LABELS,
  CATEGORIE_COLORS,
} from '@/lib/constants'
import type { Profile, LogEntry, AgendaItem, Overleg } from '@/types'

interface DashboardContentProps {
  profile: Profile
  allProfiles: Profile[]
  logboekEntries: LogEntry[]
  agendaItems: AgendaItem[]
  overleggen: Overleg[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

type ActivityItem =
  | { type: 'logboek'; entry: LogEntry; ts: string }
  | { type: 'overleg'; overleg: Overleg; ts: string }

export function DashboardContent({
  profile,
  allProfiles,
  logboekEntries,
  agendaItems,
  overleggen,
}: DashboardContentProps) {
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]))

  // Merge logboek + overleggen sorted by created_at desc, show max 5
  const activityItems: ActivityItem[] = [
    ...logboekEntries.map((e) => ({ type: 'logboek' as const, entry: e, ts: e.created_at })),
    ...overleggen.map((o) => ({ type: 'overleg' as const, overleg: o, ts: o.created_at })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 5)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 lg:p-8 space-y-6"
    >
      {/* Greeting */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {profile?.naam?.split(' ')[0] ?? 'daar'}
        </h1>
        <p className="text-sm text-muted mt-1">
          Hier is een overzicht van vandaag
        </p>
      </motion.div>

      {/* Snelle acties */}
      <motion.div variants={itemVariants}>
        <h2 className="font-semibold text-gray-900 mb-3">Snelle acties</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction
            href="/logboek?nieuw=1"
            icon={PenLine}
            label="Notitie schrijven"
            color="bg-emerald-50 text-emerald-700 border-emerald-100"
          />
          <QuickAction
            href="/taken?maakTaak=1"
            icon={CheckSquare}
            label="Maak taak"
            color="bg-blue-50 text-blue-700 border-blue-100"
          />
          <QuickAction
            href="/mail?schrijf=1"
            icon={Mail}
            label="Schrijf mail"
            color="bg-violet-50 text-violet-700 border-violet-100"
          />
          <QuickAction
            href="/overleggen"
            icon={Users}
            label="Familieoverleg"
            color="bg-amber-50 text-amber-700 border-amber-100"
          />
        </div>
      </motion.div>

      {/* Aankomende afspraken */}
      <motion.div variants={itemVariants}>
        <SectionHeader
          icon={Calendar}
          title="Aankomende afspraken"
          href="/agenda"
        />
        {agendaItems.length === 0 ? (
          <Card>
            <EmptyState
              icon={Calendar}
              title="Geen afspraken"
              description="Er zijn geen afspraken de komende 7 dagen."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {agendaItems.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 truncate">
                        {item.titel}
                      </h3>
                      <Badge className={AGENDA_TYPE_COLORS[item.type]}>
                        {AGENDA_TYPE_LABELS[item.type]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-sm text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(item.datum_tijd)} om{' '}
                        {formatTime(item.datum_tijd)}
                      </span>
                      {item.locatie && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {item.locatie}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Laatste activiteit */}
      <motion.div variants={itemVariants}>
        <SectionHeader
          icon={BookOpen}
          title="Laatste activiteit"
          href="/logboek"
        />
        {activityItems.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookOpen}
              title="Nog geen activiteit"
              description="Er zijn nog geen notities of overleggen."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {activityItems.map((item) => {
              if (item.type === 'logboek') {
                const auteur = profileMap.get(item.entry.auteur_id)
                return (
                  <Link key={`log-${item.entry.id}`} href="/logboek">
                    <Card borderColor={auteur?.kleur} className="hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Avatar
                          naam={auteur?.naam ?? 'Onbekend'}
                          kleur={auteur?.kleur ?? '#6B7280'}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">
                              {auteur?.naam ?? 'Onbekend'}
                            </span>
                            <span className="text-xs text-muted">
                              {formatRelative(item.entry.created_at)}
                            </span>
                            <Badge className={CATEGORIE_COLORS[item.entry.categorie]}>
                              {CATEGORIE_LABELS[item.entry.categorie]}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {item.entry.bericht}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )
              }

              // overleg
              const aangemaakt = profileMap.get(item.overleg.aangemaakt_door)
              return (
                <Link key={`overleg-${item.overleg.id}`} href="/overleggen">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={15} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">
                            {item.overleg.titel}
                          </span>
                          <span className="text-xs text-muted">
                            {formatRelative(item.overleg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          Overleg aangemaakt{aangemaakt ? ` door ${aangemaakt.naam}` : ''}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  href,
}: {
  icon: React.ComponentType<any>
  title: string
  href: string
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-primary" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-sm text-primary hover:underline"
      >
        Bekijk alles
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string
  icon: React.ComponentType<any>
  label: string
  color: string
}) {
  return (
    <Link href={href}>
      <div
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-center transition-all hover:scale-[1.02] hover:shadow-sm active:scale-[0.98] ${color}`}
      >
        <Icon size={22} />
        <span className="text-sm font-medium leading-tight">{label}</span>
      </div>
    </Link>
  )
}
