import { google } from 'googleapis'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
]
const ALGORITHM = 'aes-256-gcm'
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // refresh als token binnen 5 min verloopt

export class GmailTokenExpiredError extends Error {
  readonly code = 'token_expired' as const
  constructor() {
    super('Gmail koppeling verlopen. Koppel opnieuw via Beheer.')
    this.name = 'GmailTokenExpiredError'
  }
}

function getEncryptionKey(): Buffer {
  const key = process.env.GMAIL_TOKEN_ENCRYPTION_KEY
  if (!key) throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY is niet ingesteld.')
  // Key must be 32 bytes; pad/truncate from hex or utf-8
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex')
  }
  return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf-8')
}

export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(encoded: string): string {
  const key = getEncryptionKey()
  const [ivHex, tagHex, encHex] = encoded.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf-8')
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  )
}

export function getAuthUrl(): string {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function exchangeCodeForTokens(code: string, userId: string): Promise<void> {
  const client = getOAuth2Client()
  const { tokens } = await client.getToken(code)

  const accessEncrypted = encrypt(tokens.access_token!)
  const refreshEncrypted = tokens.refresh_token ? encrypt(tokens.refresh_token) : ''

  // Haal het Gmail-adres op
  client.setCredentials(tokens)
  const gmail = google.gmail({ version: 'v1', auth: client })
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const email = profile.data.emailAddress ?? null

  const adminClient = createAdminClient()

  // Singleton-patroon: altijd max 1 rij in gmail_tokens
  const { data: existing } = await adminClient
    .from('gmail_tokens')
    .select('id')
    .limit(1)
    .single()

  const baseData = {
    access_token_encrypted: accessEncrypted,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    gmail_email: email,
    connected_by: userId,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    // Alleen refresh_token overschrijven als Google een nieuwe heeft gestuurd
    // (Google stuurt refresh_token alleen bij eerste autorisatie of na prompt=consent)
    const updateData = tokens.refresh_token
      ? { ...baseData, refresh_token_encrypted: refreshEncrypted }
      : baseData
    await adminClient.from('gmail_tokens').update(updateData).eq('id', existing.id)
  } else {
    await adminClient.from('gmail_tokens').insert({ ...baseData, refresh_token_encrypted: refreshEncrypted })
  }
}

/**
 * Geeft een geldige OAuth2Client terug.
 * - Controleert proactief of de access_token binnen 5 minuten verloopt
 * - Vernieuwt automatisch via de refresh_token indien nodig
 * - Gooit GmailTokenExpiredError als refresh mislukt (token verlopen/ingetrokken)
 *   en verwijdert dan de ongeldige tokens uit Supabase
 * - Geeft null terug als er helemaal geen koppeling is
 */
export async function getAuthorizedClient() {
  const adminClient = createAdminClient()
  const { data: tokenRow } = await adminClient
    .from('gmail_tokens')
    .select('*')
    .limit(1)
    .single()

  if (!tokenRow) return null

  const client = getOAuth2Client()
  const accessToken = decrypt(tokenRow.access_token_encrypted as string)
  const refreshToken = tokenRow.refresh_token_encrypted
    ? decrypt(tokenRow.refresh_token_encrypted as string)
    : undefined
  const expiryDate = tokenRow.token_expiry
    ? new Date(tokenRow.token_expiry as string).getTime()
    : null

  // Proactief refreshen als token binnen 5 min verloopt of geen expiry bekend is
  const needsRefresh = !expiryDate || expiryDate - Date.now() < REFRESH_BUFFER_MS

  if (needsRefresh) {
    if (!refreshToken) {
      // Geen refresh_token beschikbaar — verwijder ongeldige tokens
      await adminClient.from('gmail_tokens').delete().eq('id', tokenRow.id as string)
      throw new GmailTokenExpiredError()
    }

    client.setCredentials({ refresh_token: refreshToken })
    try {
      const { credentials } = await client.refreshAccessToken()
      const updates: Record<string, string> = {
        updated_at: new Date().toISOString(),
        access_token_encrypted: encrypt(credentials.access_token!),
      }
      if (credentials.refresh_token) {
        updates.refresh_token_encrypted = encrypt(credentials.refresh_token)
      }
      if (credentials.expiry_date) {
        updates.token_expiry = new Date(credentials.expiry_date).toISOString()
      }
      await adminClient.from('gmail_tokens').update(updates).eq('id', tokenRow.id as string)
      client.setCredentials(credentials)
    } catch {
      // invalid_grant of ander OAuth-fout → verwijder tokens, dwing herverbinding
      await adminClient.from('gmail_tokens').delete().eq('id', tokenRow.id as string)
      throw new GmailTokenExpiredError()
    }
  } else {
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    })
  }

  // Luister naar eventuele lazy-refresh tokens gedurende het request
  client.on('tokens', async (newTokens) => {
    const updates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (newTokens.access_token) updates.access_token_encrypted = encrypt(newTokens.access_token)
    if (newTokens.refresh_token) updates.refresh_token_encrypted = encrypt(newTokens.refresh_token)
    if (newTokens.expiry_date) updates.token_expiry = new Date(newTokens.expiry_date).toISOString()
    await adminClient.from('gmail_tokens').update(updates).eq('id', tokenRow.id as string)
  })

  return client
}

export interface GmailMessage {
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

export async function getMessages(
  maxResults = 20,
  pageToken?: string,
  label = 'INBOX',
  query?: string,
): Promise<{
  messages: GmailMessage[]
  nextPageToken?: string
}> {
  const client = await getAuthorizedClient()
  if (!client) return { messages: [] }

  const gmail = google.gmail({ version: 'v1', auth: client })

  const listParams = {
    userId: 'me',
    maxResults,
    pageToken,
    ...(query ? { q: query } : { labelIds: [label] }),
  }

  const listRes = await gmail.users.messages.list(listParams)

  const messageIds = listRes.data.messages ?? []

  const messages: GmailMessage[] = await Promise.all(
    messageIds.map(async (m) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: m.id!,
        format: 'full',
      })

      const headers = msg.data.payload?.headers ?? []
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

      // Haal body op (plain text voorkeur, anders html)
      function extractBody(payload: typeof msg.data.payload): string {
        if (!payload) return ''

        if (payload.mimeType === 'text/plain' && payload.body?.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf-8')
        }

        if (payload.parts) {
          // Zoek plain text
          const plain = payload.parts.find((p) => p.mimeType === 'text/plain')
          if (plain?.body?.data) {
            return Buffer.from(plain.body.data, 'base64').toString('utf-8')
          }
          // Fallback: html
          const html = payload.parts.find((p) => p.mimeType === 'text/html')
          if (html?.body?.data) {
            return Buffer.from(html.body.data, 'base64').toString('utf-8')
          }
          // Recursief voor multipart
          for (const part of payload.parts) {
            const nested = extractBody(part)
            if (nested) return nested
          }
        }

        return ''
      }

      return {
        id: m.id!,
        threadId: msg.data.threadId ?? '',
        subject: getHeader('subject') || '(geen onderwerp)',
        from: getHeader('from'),
        to: getHeader('to'),
        date: getHeader('date'),
        snippet: msg.data.snippet ?? '',
        body: extractBody(msg.data.payload),
        labelIds: msg.data.labelIds ?? [],
        gelezen: false, // wordt per-gebruiker ingevuld door de API route
      }
    })
  )

  return {
    messages,
    nextPageToken: listRes.data.nextPageToken ?? undefined,
  }
}

export async function isGmailConnected(): Promise<{ connected: boolean; email?: string }> {
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('gmail_tokens')
      .select('gmail_email')
      .limit(1)
      .single()

    return { connected: !!data, email: data?.gmail_email ?? undefined }
  } catch {
    return { connected: false }
  }
}
