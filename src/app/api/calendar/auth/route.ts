import { NextResponse } from 'next/server'

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI

export async function GET() {
  if (!CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Google Calendar credentials niet ingesteld in .env.local' },
      { status: 503 }
    )
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  return NextResponse.redirect(url)
}
