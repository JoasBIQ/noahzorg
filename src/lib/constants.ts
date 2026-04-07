import {
  Home,
  BookOpen,
  CheckSquare,
  Calendar,
  Users2,
  Heart,
  UserCog,
  MessageSquare,
  Mail,
  HardDrive,
} from 'lucide-react'
import type { LogboekCategorie, TaakPrioriteit, TaakStatus, AgendaType } from '@/types'

export const USER_COLORS = [
  '#93C5FD', // blauw
  '#6EE7B7', // groen
  '#FCD34D', // geel
  '#F9A8D4', // roze
  '#C4B5FD', // paars
  '#FDBA74', // oranje
] as const

export const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home, adminOnly: false },
  { label: 'Noah', href: '/noah', icon: Heart, adminOnly: false },
  { label: 'Notities over Noah', href: '/logboek', icon: BookOpen, adminOnly: false },
  { label: 'Agenda', href: '/agenda', icon: Calendar, adminOnly: false },
  { label: 'Taken', href: '/taken', icon: CheckSquare, adminOnly: false },
  { label: 'Familieoverleg', href: '/overleggen', icon: MessageSquare, adminOnly: false },
  { label: 'Mail', href: '/mail', icon: Mail, adminOnly: false },
  { label: 'Drive', href: '/drive', icon: HardDrive, adminOnly: false },
  { label: 'Rondom Noah', href: '/team', icon: Users2, adminOnly: false },
  { label: 'Beheer', href: '/beheer', icon: UserCog, adminOnly: true },
] as const

export const CATEGORIE_LABELS: Record<LogboekCategorie, string> = {
  observatie: 'Observatie',
  zorg: 'Zorg',
  incident: 'Incident',
  emotie: 'Emotie',
  praktisch: 'Praktisch',
}

export const CATEGORIE_COLORS: Record<LogboekCategorie, string> = {
  observatie: 'bg-blue-100 text-blue-800',
  zorg: 'bg-green-100 text-green-800',
  incident: 'bg-red-100 text-red-800',
  emotie: 'bg-purple-100 text-purple-800',
  praktisch: 'bg-gray-100 text-gray-800',
}

export const STATUS_LABELS: Record<TaakStatus, string> = {
  open: 'Open',
  bezig: 'Bezig',
  gereed: 'Gereed',
  gearchiveerd: 'Gearchiveerd',
}

export const STATUS_COLORS: Record<TaakStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  bezig: 'bg-yellow-100 text-yellow-800',
  gereed: 'bg-green-100 text-green-800',
  gearchiveerd: 'bg-gray-100 text-gray-600',
}

export const PRIORITEIT_LABELS: Record<TaakPrioriteit, string> = {
  laag: 'Laag',
  normaal: 'Normaal',
  hoog: 'Hoog',
  urgent: 'Urgent',
}

export const PRIORITEIT_COLORS: Record<TaakPrioriteit, string> = {
  laag: 'bg-gray-100 text-gray-600',
  normaal: 'bg-blue-100 text-blue-800',
  hoog: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export const AGENDA_TYPE_LABELS: Record<AgendaType, string> = {
  medisch: 'Medisch',
  zorg: 'Zorg',
  juridisch: 'Juridisch',
  sociaal: 'Sociaal',
  overleg: 'Overleg',
  overig: 'Overig',
}

export const AGENDA_TYPE_COLORS: Record<AgendaType, string> = {
  medisch: 'bg-red-100 text-red-800',
  zorg: 'bg-green-100 text-green-800',
  juridisch: 'bg-purple-100 text-purple-800',
  sociaal: 'bg-yellow-100 text-yellow-800',
  overleg: 'bg-blue-100 text-blue-800',
  overig: 'bg-gray-100 text-gray-800',
}
