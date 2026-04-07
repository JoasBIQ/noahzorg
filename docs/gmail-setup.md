# Gmail Setup

De Mail-module leest e-mails uit een Gmail-inbox en toont ze in de app. Alle familie-leden kunnen lezen en intern reageren. E-mails beantwoorden gaat via de native e-mailapp (mailto:).

---

## 1. Google Cloud Project aanmaken

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com)
2. Maak een nieuw project aan (bijv. `noahs-zorg`)
3. Ga naar **APIs & Services → Library** en zoek naar **Gmail API**
4. Klik op **Enable**

---

## 2. OAuth 2.0 Credentials aanmaken

1. Ga naar **APIs & Services → Credentials**
2. Klik op **+ Create Credentials → OAuth client ID**
3. Kies **Web application** als application type
4. Voeg toe als Authorized redirect URI:
   - Lokaal: `http://localhost:3001/api/gmail/callback`
   - Productie: `https://jouw-domein.nl/api/gmail/callback`
5. Klik op **Create**
6. Noteer de **Client ID** en **Client Secret**

---

## 3. OAuth Consent Screen instellen

1. Ga naar **APIs & Services → OAuth consent screen**
2. Kies **Internal** (alleen voor jouw Google Workspace) of **External**
3. Vul app-naam in en voeg het e-mailadres toe
4. Voeg scope toe: `https://www.googleapis.com/auth/gmail.readonly`
5. Voeg het Gmail-adres toe als testgebruiker (als External)

---

## 4. Encryptiesleutel genereren

De tokens worden versleuteld opgeslagen. Genereer een 32-byte sleutel:

```bash
openssl rand -hex 32
```

Kopieer de uitvoer (64 hex-tekens).

---

## 5. Omgevingsvariabelen instellen

Voeg toe aan `.env.local`:

```
GMAIL_CLIENT_ID=jouw-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=jouw-client-secret
GMAIL_REDIRECT_URI=http://localhost:3001/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=jouw-64-char-hex-key
```

Voor productie:
```
GMAIL_REDIRECT_URI=https://jouw-domein.nl/api/gmail/callback
```

---

## 6. Supabase migratie uitvoeren

Voer migratie `013_gmail.sql` uit in de Supabase SQL editor:
- Tabel `gmail_tokens` (opslag van versleutelde OAuth tokens)
- Tabel `mail_reacties` (interne familie-reacties per mail)

---

## 7. Gmail koppelen

1. Log in als beheerder
2. Ga naar **Beheer**
3. Klik in de **Gmail koppeling** sectie op **Gmail koppelen via Google**
4. Volg de Google OAuth-stroom en geef toestemming
5. Je wordt teruggeleid naar Beheer met een bevestiging

---

## 8. Gebruik

- Ga naar **Mail** in het navigatiemenu
- Alle berichten uit de inbox worden getoond (max 25 per keer)
- Klik op een bericht om het te openen
- Gebruik **Familie-discussie** om intern te reageren
- Gebruik **Beantwoorden in e-mail** om te antwoorden via de native e-mailapp

---

## Aantekeningen

- De app heeft alleen **leestoegang** (`gmail.readonly`). Er worden geen mails verstuurd.
- Tokens worden versleuteld opgeslagen met AES-256-GCM.
- Alleen de beheerder kan Gmail koppelen/ontkoppelen.
- Alle ingelogde familie-leden kunnen e-mails lezen en reageren.
