export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'beheerder' | 'gebruiker'
export type LogboekCategorie = 'observatie' | 'zorg' | 'incident' | 'emotie' | 'praktisch'
export type TaakStatus = 'open' | 'bezig' | 'gereed' | 'gearchiveerd'
export type TaakPrioriteit = 'laag' | 'normaal' | 'hoog' | 'urgent'
export type AgendaType = 'medisch' | 'zorg' | 'juridisch' | 'sociaal' | 'overleg' | 'overig'
export type MedicatieStatus = 'actief' | 'gestopt' | 'on_hold'
export type TrajectStatus = 'lopend' | 'afgerond' | 'on_hold' | 'gestopt'
export type BestandCategorie = 'brief' | 'rapport' | 'indicatie' | 'foto' | 'overig'
export type DossierCategorie = 'brief' | 'rapport' | 'verslag' | 'recept' | 'indicatie' | 'juridisch' | 'financieel' | 'overleg_extern' | 'overig'

export interface Reactie {
  auteur_id: string
  naam: string
  kleur: string
  bericht: string
  created_at: string
}

export interface Bespreekpunt {
  tekst: string
  toegevoegd_door: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          naam: string
          rol: UserRole
          kleur: string
          created_at: string
        }
        Insert: {
          id: string
          naam: string
          rol?: UserRole
          kleur?: string
          created_at?: string
        }
        Update: {
          id?: string
          naam?: string
          rol?: UserRole
          kleur?: string
        }
      }
      noah_profiel: {
        Row: {
          id: string
          volledige_naam: string | null
          geboortedatum: string | null
          bsn_encrypted: string | null
          diagnose: string | null
          huisarts: string | null
          zorgkantoor: string | null
          zorgkantoor_nummer: string | null
          notities: string | null
          // Wie is Noah
          karakter: string | null
          wat_fijn: string | null
          wat_onrustig: string | null
          communicatie: string | null
          // Dagelijks leven (migratie 011)
          dagritme: string | null
          eetgewoontes: string | null
          slaap: string | null
          activiteiten: string | null
          gewoontes: string | null
          // Praktisch: wonen (migratie 011)
          wonen_huidig: string | null
          wonen_historie: string | null
          wonen_wensen: string | null
          // Praktisch: financieel & juridisch (migratie 011)
          financieel_notities: string | null
          juridisch_notities: string | null
          // Medisch: huisarts details (migratie 011)
          huisarts_naam: string | null
          huisarts_praktijk: string | null
          huisarts_telefoon: string | null
          // Medisch: reanimatie (migratie 010)
          reanimatie_beleid: string | null
          reanimatie_toelichting: string | null
          reanimatie_gesprek_gevoerd: boolean
          reanimatie_gesprek_datum: string | null
          reanimatie_gesprek_met: string | null
          // Medisch: medicatielijst (migratie 010 + 011)
          medicatielijst_apotheek_link: string | null
          medicatielijst_tekst: string | null
          medicatielijst_afbeelding_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          volledige_naam?: string | null
          geboortedatum?: string | null
          bsn_encrypted?: string | null
          diagnose?: string | null
          huisarts?: string | null
          zorgkantoor?: string | null
          zorgkantoor_nummer?: string | null
          notities?: string | null
          karakter?: string | null
          wat_fijn?: string | null
          wat_onrustig?: string | null
          communicatie?: string | null
          dagritme?: string | null
          eetgewoontes?: string | null
          slaap?: string | null
          activiteiten?: string | null
          gewoontes?: string | null
          wonen_huidig?: string | null
          wonen_historie?: string | null
          wonen_wensen?: string | null
          financieel_notities?: string | null
          juridisch_notities?: string | null
          huisarts_naam?: string | null
          huisarts_praktijk?: string | null
          huisarts_telefoon?: string | null
          reanimatie_beleid?: string | null
          reanimatie_toelichting?: string | null
          reanimatie_gesprek_gevoerd?: boolean
          reanimatie_gesprek_datum?: string | null
          reanimatie_gesprek_met?: string | null
          medicatielijst_apotheek_link?: string | null
          medicatielijst_tekst?: string | null
          medicatielijst_afbeelding_url?: string | null
          updated_by?: string | null
        }
        Update: {
          volledige_naam?: string | null
          geboortedatum?: string | null
          bsn_encrypted?: string | null
          diagnose?: string | null
          huisarts?: string | null
          zorgkantoor?: string | null
          zorgkantoor_nummer?: string | null
          notities?: string | null
          karakter?: string | null
          wat_fijn?: string | null
          wat_onrustig?: string | null
          communicatie?: string | null
          dagritme?: string | null
          eetgewoontes?: string | null
          slaap?: string | null
          activiteiten?: string | null
          gewoontes?: string | null
          wonen_huidig?: string | null
          wonen_historie?: string | null
          wonen_wensen?: string | null
          financieel_notities?: string | null
          juridisch_notities?: string | null
          huisarts_naam?: string | null
          huisarts_praktijk?: string | null
          huisarts_telefoon?: string | null
          reanimatie_beleid?: string | null
          reanimatie_toelichting?: string | null
          reanimatie_gesprek_gevoerd?: boolean
          reanimatie_gesprek_datum?: string | null
          reanimatie_gesprek_met?: string | null
          medicatielijst_apotheek_link?: string | null
          medicatielijst_tekst?: string | null
          medicatielijst_afbeelding_url?: string | null
          updated_by?: string | null
        }
      }
      logboek: {
        Row: {
          id: string
          created_at: string
          auteur_id: string
          categorie: LogboekCategorie
          bericht: string
          gearchiveerd: boolean
          gearchiveerd_door: string | null
          gearchiveerd_op: string | null
          reacties: Reactie[]
          gelezen_door: string[]
        }
        Insert: {
          id?: string
          created_at?: string
          auteur_id: string
          categorie?: LogboekCategorie
          bericht: string
          gearchiveerd?: boolean
          gearchiveerd_door?: string | null
          gearchiveerd_op?: string | null
          reacties?: Reactie[]
          gelezen_door?: string[]
        }
        Update: {
          categorie?: LogboekCategorie
          bericht?: string
          gearchiveerd?: boolean
          gearchiveerd_door?: string | null
          gearchiveerd_op?: string | null
          reacties?: Reactie[]
          gelezen_door?: string[]
        }
      }
      taken: {
        Row: {
          id: string
          created_at: string
          titel: string
          omschrijving: string | null
          toegewezen_aan: string | null
          deadline: string | null
          prioriteit: TaakPrioriteit
          status: TaakStatus
          aangemaakt_door: string
          gearchiveerd: boolean
          overleg_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          titel: string
          omschrijving?: string | null
          toegewezen_aan?: string | null
          deadline?: string | null
          prioriteit?: TaakPrioriteit
          status?: TaakStatus
          aangemaakt_door: string
          gearchiveerd?: boolean
          overleg_id?: string | null
        }
        Update: {
          titel?: string
          omschrijving?: string | null
          toegewezen_aan?: string | null
          deadline?: string | null
          prioriteit?: TaakPrioriteit
          status?: TaakStatus
          gearchiveerd?: boolean
          overleg_id?: string | null
        }
      }
      agenda: {
        Row: {
          id: string
          created_at: string
          titel: string
          datum_tijd: string
          eind_tijd: string | null
          type: AgendaType
          locatie: string | null
          notities: string | null
          betrokkenen: string[]
          aangemaakt_door: string
          google_event_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          titel: string
          datum_tijd: string
          eind_tijd?: string | null
          type?: AgendaType
          locatie?: string | null
          notities?: string | null
          betrokkenen?: string[]
          aangemaakt_door: string
          google_event_id?: string | null
        }
        Update: {
          titel?: string
          datum_tijd?: string
          eind_tijd?: string | null
          type?: AgendaType
          locatie?: string | null
          notities?: string | null
          betrokkenen?: string[]
          google_event_id?: string | null
        }
      }
      medicaties: {
        Row: {
          id: string
          naam: string
          dosering: string | null
          frequentie: string | null
          voorschrijver: string | null
          startdatum: string | null
          einddatum: string | null
          status: MedicatieStatus
          notities: string | null
          aangemaakt_door: string | null
          updated_at: string
          gearchiveerd: boolean
        }
        Insert: {
          id?: string
          naam: string
          dosering?: string | null
          frequentie?: string | null
          voorschrijver?: string | null
          startdatum?: string | null
          einddatum?: string | null
          status?: MedicatieStatus
          notities?: string | null
          aangemaakt_door?: string | null
          gearchiveerd?: boolean
        }
        Update: {
          naam?: string
          dosering?: string | null
          frequentie?: string | null
          voorschrijver?: string | null
          startdatum?: string | null
          einddatum?: string | null
          status?: MedicatieStatus
          notities?: string | null
          gearchiveerd?: boolean
        }
      }
      trajecten: {
        Row: {
          id: string
          naam_traject: string
          organisatie: string | null
          contactpersoon: string | null
          contactpersoon_email: string | null
          contactpersoon_telefoon: string | null
          startdatum: string | null
          einddatum: string | null
          status: TrajectStatus
          notities: string | null
          aangemaakt_door: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          naam_traject: string
          organisatie?: string | null
          contactpersoon?: string | null
          contactpersoon_email?: string | null
          contactpersoon_telefoon?: string | null
          startdatum?: string | null
          einddatum?: string | null
          status?: TrajectStatus
          notities?: string | null
          aangemaakt_door?: string | null
        }
        Update: {
          naam_traject?: string
          organisatie?: string | null
          contactpersoon?: string | null
          contactpersoon_email?: string | null
          contactpersoon_telefoon?: string | null
          startdatum?: string | null
          einddatum?: string | null
          status?: TrajectStatus
          notities?: string | null
        }
      }
      accounts_kluis: {
        Row: {
          id: string
          platform: string
          gebruikersnaam: string | null
          wachtwoord_encrypted: string | null
          notities: string | null
          created_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          platform: string
          gebruikersnaam?: string | null
          wachtwoord_encrypted?: string | null
          notities?: string | null
          updated_by?: string | null
        }
        Update: {
          platform?: string
          gebruikersnaam?: string | null
          wachtwoord_encrypted?: string | null
          notities?: string | null
          updated_by?: string | null
        }
      }
      bestanden: {
        Row: {
          id: string
          created_at: string
          naam: string
          beschrijving: string | null
          categorie: BestandCategorie
          storage_path: string
          geupload_door: string
        }
        Insert: {
          id?: string
          created_at?: string
          naam: string
          beschrijving?: string | null
          categorie?: BestandCategorie
          storage_path: string
          geupload_door: string
        }
        Update: {
          naam?: string
          beschrijving?: string | null
          categorie?: BestandCategorie
        }
      }
      overleggen: {
        Row: {
          id: string
          created_at: string
          titel: string
          datum_tijd: string
          aanwezigen: string[]
          bespreekpunten: Bespreekpunt[]
          notities: string | null
          drive_verslag_id: string | null
          drive_opname_id: string | null
          aangemaakt_door: string
          gearchiveerd: boolean
          aanwezigen_tekst: string | null
          bron: string
        }
        Insert: {
          id?: string
          created_at?: string
          titel: string
          datum_tijd: string
          aanwezigen?: string[]
          bespreekpunten?: Bespreekpunt[]
          notities?: string | null
          drive_verslag_id?: string | null
          drive_opname_id?: string | null
          aangemaakt_door: string
          gearchiveerd?: boolean
          aanwezigen_tekst?: string | null
          bron?: string
        }
        Update: {
          titel?: string
          datum_tijd?: string
          aanwezigen?: string[]
          bespreekpunten?: Bespreekpunt[]
          notities?: string | null
          gearchiveerd?: boolean
          drive_verslag_id?: string | null
          drive_opname_id?: string | null
          aanwezigen_tekst?: string | null
          bron?: string
        }
      }
      app_instellingen: {
        Row: {
          id: string
          key: string
          value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          value: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string
          updated_by?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          created_at: string
          gebruiker_id: string
          actie: string
          module: string
          omschrijving: string
          metadata: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          created_at?: string
          gebruiker_id: string
          actie: string
          module: string
          omschrijving: string
          metadata?: Record<string, unknown> | null
        }
        Update: never
      }
      dossier_items: {
        Row: {
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
          gearchiveerd: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          titel: string
          categorie?: DossierCategorie
          datum_document?: string | null
          afzender?: string | null
          samenvatting?: string | null
          inhoud?: string | null
          drive_link?: string | null
          aangemaakt_door: string
          gearchiveerd?: boolean
        }
        Update: {
          titel?: string
          categorie?: DossierCategorie
          datum_document?: string | null
          afzender?: string | null
          samenvatting?: string | null
          inhoud?: string | null
          drive_link?: string | null
          gearchiveerd?: boolean
        }
      }
      contacten: {
        Row: {
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
          gearchiveerd: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          naam: string
          functie?: string | null
          organisatie?: string | null
          telefoon?: string | null
          email?: string | null
          adres?: string | null
          notities?: string | null
          is_noodcontact?: boolean
          nood_volgorde?: number | null
          aangemaakt_door: string
          gearchiveerd?: boolean
        }
        Update: {
          naam?: string
          functie?: string | null
          organisatie?: string | null
          telefoon?: string | null
          email?: string | null
          adres?: string | null
          notities?: string | null
          is_noodcontact?: boolean
          nood_volgorde?: number | null
          gearchiveerd?: boolean
        }
      }
      behandelaars: {
        Row: {
          id: string
          created_at: string
          naam: string
          specialisme: string | null
          ziekenhuis: string | null
          telefoon: string | null
          notities: string | null
          aangemaakt_door: string
          gearchiveerd: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          naam: string
          specialisme?: string | null
          ziekenhuis?: string | null
          telefoon?: string | null
          notities?: string | null
          aangemaakt_door: string
          gearchiveerd?: boolean
        }
        Update: {
          naam?: string
          specialisme?: string | null
          ziekenhuis?: string | null
          telefoon?: string | null
          notities?: string | null
          gearchiveerd?: boolean
        }
      }
      document_verwijzingen: {
        Row: {
          id: string
          created_at: string
          naam: string
          omschrijving: string | null
          locatie: string | null
          aangemaakt_door: string
          gearchiveerd: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          naam: string
          omschrijving?: string | null
          locatie?: string | null
          aangemaakt_door: string
          gearchiveerd?: boolean
        }
        Update: {
          naam?: string
          omschrijving?: string | null
          locatie?: string | null
          gearchiveerd?: boolean
        }
      }
      gmail_tokens: {
        Row: {
          id: string
          access_token_encrypted: string
          refresh_token_encrypted: string
          token_expiry: string | null
          gmail_email: string | null
          connected_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          access_token_encrypted: string
          refresh_token_encrypted: string
          token_expiry?: string | null
          gmail_email?: string | null
          connected_by?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          refresh_token_encrypted?: string
          token_expiry?: string | null
          gmail_email?: string | null
          connected_by?: string | null
          updated_at?: string
        }
      }
      mail_reacties: {
        Row: {
          id: string
          gmail_message_id: string
          auteur_id: string
          bericht: string
          created_at: string
        }
        Insert: {
          id?: string
          gmail_message_id: string
          auteur_id: string
          bericht: string
          created_at?: string
        }
        Update: {
          bericht?: string
        }
      }
      mail_leestatus: {
        Row: {
          id: string
          gmail_message_id: string
          gebruiker_id: string
          gelezen_op: string
        }
        Insert: {
          id?: string
          gmail_message_id: string
          gebruiker_id: string
          gelezen_op?: string
        }
        Update: {
          gelezen_op?: string
        }
      }
      mail_reacties_leestatus: {
        Row: {
          id: string
          mail_reactie_id: string
          gebruiker_id: string
          gelezen_op: string
        }
        Insert: {
          id?: string
          mail_reactie_id: string
          gebruiker_id: string
          gelezen_op?: string
        }
        Update: {
          gelezen_op?: string
        }
      }
    }
  }
}
