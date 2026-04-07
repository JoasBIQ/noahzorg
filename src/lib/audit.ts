import { createClient } from '@/lib/supabase/client'

type AuditModule = 'notities' | 'agenda' | 'overleggen' | 'noah_profiel' | 'team'
type AuditActie = 'aangemaakt' | 'gewijzigd' | 'gearchiveerd' | 'verwijderd' | 'reactie' | 'uitgenodigd'

interface AuditLogParams {
  gebruikerId: string
  actie: AuditActie
  module: AuditModule
  omschrijving: string
  metadata?: Record<string, unknown>
}

export async function logAudit({
  gebruikerId,
  actie,
  module,
  omschrijving,
  metadata,
}: AuditLogParams) {
  try {
    const supabase = createClient()
    await supabase.from('audit_log').insert({
      gebruiker_id: gebruikerId,
      actie,
      module,
      omschrijving,
      metadata: metadata ?? null,
    })
  } catch {
    // Fire-and-forget: audit logging mag nooit de gebruiker blokkeren
    console.warn('Audit log schrijven mislukt')
  }
}
