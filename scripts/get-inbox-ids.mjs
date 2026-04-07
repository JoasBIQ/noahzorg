import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import crypto from 'crypto'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const { data: tokenRow } = await admin.from('gmail_tokens').select('*').limit(1).single()

const key = Buffer.from(env.GMAIL_TOKEN_ENCRYPTION_KEY, 'hex')
const decrypt = (enc) => {
  const [ivH, tagH, encH] = enc.split(':')
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivH, 'hex'))
  d.setAuthTag(Buffer.from(tagH, 'hex'))
  return Buffer.concat([d.update(Buffer.from(encH, 'hex')), d.final()]).toString('utf-8')
}

const auth = new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, env.GMAIL_REDIRECT_URI)
auth.setCredentials({ access_token: decrypt(tokenRow.access_token_encrypted) })

const gmail = google.gmail({ version: 'v1', auth })
const list = await gmail.users.messages.list({ userId: 'me', labelIds: ['INBOX'], maxResults: 5 })

const previews = await Promise.all((list.data.messages ?? []).map(async (m) => {
  const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'From'] })
  const get = (name) => msg.data.payload?.headers?.find((h) => h.name?.toLowerCase() === name)?.value ?? ''
  return { id: m.id, subject: get('subject'), from: get('from') }
}))

console.log(JSON.stringify(previews, null, 2))
