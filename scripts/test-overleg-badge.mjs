/**
 * Test: overleg-reactie badge systeem
 *
 * Stappen:
 * 1. Haal Joas op
 * 2. Maak tijdelijke auth-gebruiker + profile aan (via Supabase Admin Auth API)
 * 3. Plaats reactie van testgebruiker op dummy bericht-ID
 * 4. Check: Joas ziet 1 ongelezen reactie, testbericht staat in messageIds
 * 5. Check: testgebruiker ziet eigen reactie NIET (self-exclusion)
 * 6. Markeer als gelezen voor Joas
 * 7. Check: count daalt naar 0 voor Joas
 * 8. Dubbele markering mag geen fout geven (UNIQUE + ignoreDuplicates)
 * 9. Opruimen
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gjsoywphtcnnjlmplddh.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc295d3BodGNubmpsbXBsZGRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgwMTQyMCwiZXhwIjoyMDkwMzc3NDIwfQ.BN1oRHkDvzHxu0OlA6bTo65BuK0-15YIvDvr-kQRDAs'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OK  = (msg) => console.log(`  ✅ ${msg}`)
const ERR = (msg) => { console.error(`  ❌ ${msg}`); hadError = true }
const LOG = (msg) => console.log(`  ℹ️  ${msg}`)
let hadError = false

// Simuleer de logica uit counts/route.ts en reacties-leestatus/route.ts
async function getOngelezen(gebruikerId) {
  const [{ data: alle }, { data: gelezen }] = await Promise.all([
    admin.from('mail_reacties').select('id, gmail_message_id').neq('auteur_id', gebruikerId),
    admin.from('mail_reacties_leestatus').select('mail_reactie_id').eq('gebruiker_id', gebruikerId),
  ])
  const gelezenSet = new Set((gelezen ?? []).map((g) => g.mail_reactie_id))
  const ongelezen = (alle ?? []).filter((r) => !gelezenSet.has(r.id))
  const messageIds = [...new Set(ongelezen.map((r) => r.gmail_message_id))]
  return { count: ongelezen.length, messageIds }
}

async function run() {
  console.log('\n🧪 Test: overleg-reactie badge systeem\n')
  const TEST_MESSAGE_ID = 'test-msg-' + Date.now()
  const TEST_EMAIL = `testuser-${Date.now()}@noahs-zorg-test.local`
  let authUserId = null
  let testReactieId = null

  try {
    // ── Stap 1: Joas ophalen ──────────────────────────────────────────────
    console.log('Stap 1: Joas ophalen...')
    const { data: joas } = await admin.from('profiles').select('id, naam').limit(1).single()
    if (!joas) { ERR('Geen gebruiker gevonden'); return }
    LOG(`Gevonden: ${joas.naam} (${joas.id})`)

    // ── Stap 2: Tijdelijke auth-gebruiker + profile ───────────────────────
    console.log('\nStap 2: tijdelijke testgebruiker aanmaken...')
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: 'TestWachtwoord123!',
      email_confirm: true,
      user_metadata: { naam: '[TEST] Nep familielid' },
    })
    if (authErr || !authData?.user) {
      ERR(`Auth-gebruiker aanmaken mislukt: ${authErr?.message}`)
      return
    }
    authUserId = authData.user.id
    LOG(`Auth-gebruiker aangemaakt: ${authUserId}`)

    // Profile aanmaken (trigger doet dit soms automatisch, anders handmatig)
    const { error: profErr } = await admin.from('profiles').upsert({
      id: authUserId,
      naam: '[TEST] Nep familielid',
      rol: 'gebruiker',
      kleur: '#999999',
    })
    if (profErr) {
      ERR(`Profile aanmaken mislukt: ${profErr.message}`)
      return
    }
    OK(`Testgebruiker + profile aangemaakt (${TEST_EMAIL})`)

    // ── Stap 3: Reactie van testgebruiker plaatsen ────────────────────────
    console.log('\nStap 3: reactie plaatsen (van testgebruiker op dummy bericht)...')
    const { data: reactie, error: rErr } = await admin
      .from('mail_reacties')
      .insert({
        gmail_message_id: TEST_MESSAGE_ID,
        auteur_id: authUserId,
        bericht: '[TEST] Hallo! Dit is een automatische testreactie.',
      })
      .select('id')
      .single()

    if (rErr || !reactie) { ERR(`Reactie aanmaken mislukt: ${rErr?.message}`); return }
    testReactieId = reactie.id
    OK(`Reactie aangemaakt (${reactie.id})`)

    // ── Stap 4: Joas ziet de reactie als ongelezen ────────────────────────
    console.log('\nStap 4: Joas ziet de reactie als ongelezen...')
    const voor = await getOngelezen(joas.id)
    if (voor.messageIds.includes(TEST_MESSAGE_ID)) {
      OK(`Joas heeft ${voor.count} ongelezen reactie(s) — testbericht in messageIds ✓`)
    } else {
      ERR(`Testbericht NIET in messageIds voor Joas (totaal ongelezen: ${voor.count})`)
    }

    // ── Stap 5: Testgebruiker ziet eigen reactie NIET ─────────────────────
    console.log('\nStap 5: testgebruiker ziet eigen reactie NIET als ongelezen...')
    const eigen = await getOngelezen(authUserId)
    if (!eigen.messageIds.includes(TEST_MESSAGE_ID)) {
      OK(`Testgebruiker ziet eigen reactie niet (self-exclusion werkt ✓)`)
    } else {
      ERR(`Testgebruiker ziet eigen reactie als ongelezen — fout in logica!`)
    }

    // ── Stap 6: Markeer als gelezen voor Joas ────────────────────────────
    console.log('\nStap 6: markeren als gelezen voor Joas...')
    const { error: lErr } = await admin
      .from('mail_reacties_leestatus')
      .upsert(
        [{ mail_reactie_id: reactie.id, gebruiker_id: joas.id }],
        { onConflict: 'mail_reactie_id,gebruiker_id', ignoreDuplicates: true }
      )
    if (lErr) {
      ERR(`Leestatus opslaan mislukt: ${lErr.message}`)
    } else {
      OK(`Leestatus opgeslagen`)
    }

    // ── Stap 7: Count voor Joas is nu 0 voor dit bericht ─────────────────
    console.log('\nStap 7: count na markering...')
    const na = await getOngelezen(joas.id)
    if (!na.messageIds.includes(TEST_MESSAGE_ID)) {
      OK(`Testbericht staat niet meer in ongelezen lijst voor Joas ✓`)
    } else {
      ERR(`Testbericht staat NOG in ongelezen lijst — markering mislukt!`)
    }

    // ── Stap 8: Dubbele upsert mag geen fout geven ────────────────────────
    console.log('\nStap 8: dubbele markering (UNIQUE constraint test)...')
    const { error: dupErr } = await admin
      .from('mail_reacties_leestatus')
      .upsert(
        [{ mail_reactie_id: reactie.id, gebruiker_id: joas.id }],
        { onConflict: 'mail_reactie_id,gebruiker_id', ignoreDuplicates: true }
      )
    if (!dupErr) {
      OK(`Dubbele upsert geeft geen fout (UNIQUE + ignoreDuplicates werkt ✓)`)
    } else {
      ERR(`Dubbele upsert gaf fout: ${dupErr.message}`)
    }

  } finally {
    // ── Opruimen ──────────────────────────────────────────────────────────
    console.log('\nOpruimen...')
    if (testReactieId) {
      await admin.from('mail_reacties_leestatus').delete().eq('mail_reactie_id', testReactieId)
      await admin.from('mail_reacties').delete().eq('id', testReactieId)
      OK('Reactie + leestatus verwijderd')
    }
    if (authUserId) {
      await admin.from('profiles').delete().eq('id', authUserId)
      await admin.auth.admin.deleteUser(authUserId)
      OK('Testgebruiker verwijderd')
    }
  }

  console.log(hadError
    ? '\n❌ Test afgerond MET fouten\n'
    : '\n🎉 Alle tests geslaagd!\n'
  )
}

run().catch((err) => {
  console.error('\n💥 Onverwachte fout:', err.message ?? err)
  process.exit(1)
})
