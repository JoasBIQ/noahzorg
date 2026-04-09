export type { Database, Reactie, Bespreekpunt } from './database'
export type {
  UserRole,
  LogboekCategorie,
  TaakStatus,
  TaakPrioriteit,
  AgendaType,
  MedicatieStatus,
  TrajectStatus,
  BestandCategorie,
} from './database'

import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type NoahProfiel = Database['public']['Tables']['noah_profiel']['Row']
export type LogEntry = Database['public']['Tables']['logboek']['Row']
export type Taak = Database['public']['Tables']['taken']['Row']
export type AgendaItem = Database['public']['Tables']['agenda']['Row']
export type Medicatie = Database['public']['Tables']['medicaties']['Row']
export type Traject = Database['public']['Tables']['trajecten']['Row']
export type AccountKluis = Database['public']['Tables']['accounts_kluis']['Row']
export type Bestand = Database['public']['Tables']['bestanden']['Row']
export type Overleg = Database['public']['Tables']['overleggen']['Row']
export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string
  webContentLink?: string
}

export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  location?: string
  description?: string
  htmlLink: string
  isGoogleEvent: true
  /** 'family' = familieagenda (schrijfbaar), 'noah' = Noah's persoonlijke iCal (alleen-lezen) */
  source: 'family' | 'noah'
  aangemaakt_door?: string
}

export type CalendarDisplayItem =
  | (AgendaItem & { isGoogleEvent?: false })
  | GoogleCalendarEvent

export type DossierCategorie = 'brief' | 'rapport' | 'verslag' | 'recept' | 'indicatie' | 'juridisch' | 'financieel' | 'overleg_extern' | 'overig'

export interface DossierItem {
  id: string
  created_at: string
  titel: string
  categorie: DossierCategorie
  datum_document: string | null
  afzender: string | null
  samenvatting: string | null
  inhoud: string | null
  drive_link: string | null
  aangemaakt_door: string
}

export interface Contact {
  id: string
  created_at: string
  naam: string
  functie: string | null
  organisatie: string | null
  telefoon: string | null
  email: string | null
  adres: string | null
  notities: string | null
  is_noodcontact: boolean
  nood_volgorde: number | null
  aangemaakt_door: string
}

export interface Behandelaar {
  id: string
  created_at?: string
  naam: string
  specialisme: string | null
  ziekenhuis: string | null
  telefoon: string | null
  notities: string | null
  aangemaakt_door: string
}

export interface DocumentVerwijzing {
  id: string
  created_at?: string
  naam: string
  omschrijving: string | null
  locatie: string | null
  aangemaakt_door: string
}
