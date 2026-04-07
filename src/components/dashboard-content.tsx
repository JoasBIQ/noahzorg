'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar,
  CheckSquare,
  BookOpen,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import {
  getGreeting,
  formatDate,
  formatTime,
  formatRelative,
  cn,
} from '@/lib/utils'
import {
  AGENDA_TYPE_LABELS,
  AGENDA_TYPE_COLORS,
  CATEGORIE_LABELS,
  CATEGORIE_COLORS,
} from '@/lib/constants'
import type { Profile, LogEntry, AgendaItem } from '@/types'

interface DashboardContentProps {
  profile: Profile
  allProfiles: Profile[]
  logboekEntries: LogEntry[]
  agendaItems: AgendaItem[]
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

export function DashboardContent({
  profile,
  allProfiles,
  logboekEntries,
  agendaItems,
}: DashboardContentProps) {
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]))

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

      {/* Eerstvolgende afspraken */}
      <motion.div variants={itemVariants}>
        <SectionHeader
          icon={Calendar}
          title="Eerstvolgende afspraken"
          href="/agenda"
        />
        {agendaItems.length === 0 ? (
          <Card>
            <EmptyState
              icon={Calendar}
              title="Geen afspraken"
              description="Er zijn geen aankomende afspraken gepland."
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

      {/* Taken (Trello) */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-primary" />
            <h2 className="font-semibold text-gray-900">Taken</h2>
          </div>
        </div>
        <TrelloDashboardCard />
      </motion.div>

      {/* Laatste berichten */}
      <motion.div variants={itemVariants}>
        <SectionHeader
          icon={BookOpen}
          title="Notities over Noah"
          href="/logboek"
        />
        {logboekEntries.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookOpen}
              title="Nog geen berichten"
              description="Er zijn nog geen notities over Noah geschreven."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {logboekEntries.map((entry) => {
              const auteur = profileMap.get(entry.auteur_id)
              return (
                <Card
                  key={entry.id}
                  borderColor={auteur?.kleur}
                >
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
                          {formatRelative(entry.created_at)}
                        </span>
                        <Badge className={CATEGORIE_COLORS[entry.categorie]}>
                          {CATEGORIE_LABELS[entry.categorie]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {entry.bericht}
                      </p>
                    </div>
                  </div>
                </Card>
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

function TrelloDashboardCard() {
  return (
    <Card>
      <Link
        href="/taken"
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm text-gray-700">
            Taken bekijken
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <CheckSquare size={16} />
          Open taken
        </div>
      </Link>
    </Card>
  )
}
