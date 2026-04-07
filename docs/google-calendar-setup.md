# Google Calendar koppeling instellen

Deze gids beschrijft hoe je de Google Calendar OAuth-koppeling activeert voor Noah's Zorg.

## Vereisten

- Een Google-account
- Toegang tot Google Cloud Console
- Het Noah's Zorg project draait lokaal of op een server

## Stappen

### 1. Google Cloud project aanmaken

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com)
2. Maak een nieuw project aan (bijv. "Noahs Zorg")
3. Activeer de **Google Calendar API** via API's en services → Library → zoek "Calendar API"

### 2. OAuth credentials aanmaken

1. Ga naar **API's en services** → **Inloggegevens**
2. Klik **+ Inloggegevens maken** → **OAuth 2.0-client-ID**
3. Kies als type: **Webtoepassing**
4. Geef het een naam, bijv. "Noah's Zorg Calendar"
5. Voeg toe bij **Geautoriseerde omleidings-URI's**:
   - Lokaal: `http://localhost:3001/api/calendar/callback`
   - Productie: `https://jouw-domein.nl/api/calendar/callback`
6. Klik **Maken** en kopieer de **Client ID** en **Client Secret**

### 3. OAuth-toestemmingsscherm instellen

1. Ga naar **API's en services** → **OAuth-toestemmingsscherm**
2. Kies **Extern** en klik **Maken**
3. Vul de verplichte velden in (appnaam, e-mail)
4. Voeg scope toe: `https://www.googleapis.com/auth/calendar`
5. Voeg jezelf toe als testgebruiker

### 4. Omgevingsvariabelen instellen

Voeg toe aan `.env.local`:

```env
GOOGLE_CALENDAR_CLIENT_ID=jouw-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-jouw-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/calendar/callback
```

### 5. Activeren in de app

Herstart de Next.js server na het instellen van de variabelen. In Beheer verschijnt dan de actieve koppelknop "Koppel Google Agenda".

## Scopes

De app vraagt de volgende scope aan:
- `https://www.googleapis.com/auth/calendar` — lezen en schrijven van agenda-events

## Tokens

Tokens worden opgeslagen in de `calendar_tokens` tabel in Supabase. Alleen beheerders hebben hier toegang toe via RLS.
