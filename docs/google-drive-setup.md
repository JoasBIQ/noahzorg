# Google Drive Integratie - Setup Instructies

## Overzicht

De app maakt alleen-lezen verbinding met een gedeelde Google Drive map genaamd "Noah's Zorg - Overleggen". Fireflies exporteert automatisch samenvattingen en opnames naar deze map. De app leest deze bestanden en toont ze in de Overleggen-module.

## Stappen

### 1. Google Cloud Project aanmaken

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Klik op "Nieuw project" en noem het "Noahs Zorg"
3. Selecteer het nieuwe project

### 2. Google Drive API inschakelen

1. Ga naar "APIs en services" > "Bibliotheek"
2. Zoek naar "Google Drive API"
3. Klik op "Inschakelen"

### 3. Service Account aanmaken

1. Ga naar "APIs en services" > "Inloggegevens"
2. Klik op "Inloggegevens aanmaken" > "Serviceaccount"
3. Vul in:
   - Naam: `noahs-zorg-drive`
   - Beschrijving: "Alleen-lezen toegang tot Drive map voor Noah's Zorg app"
4. Klik op "Maken en doorgaan"
5. Sla de roltoewijzing over (geen extra rollen nodig)
6. Klik op "Gereed"

### 4. Sleutel downloaden

1. Klik op het aangemaakte serviceaccount
2. Ga naar het tabblad "Sleutels"
3. Klik op "Sleutel toevoegen" > "Nieuwe sleutel maken"
4. Kies "JSON" en klik op "Maken"
5. Het JSON-bestand wordt gedownload

### 5. Credentials in .env.local zetten

Open het gedownloade JSON-bestand en kopieer de waarden naar je `.env.local`:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=noahs-zorg-drive@jouw-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nJOUW_PRIVATE_KEY_HIER\n-----END PRIVATE KEY-----\n"
```

Let op: de private key moet tussen dubbele aanhalingstekens staan en `\n` gebruiken voor regelovergangen.

### 6. Drive-map delen met het serviceaccount

1. Ga naar Google Drive
2. Zoek de map "Noah's Zorg - Overleggen" (of maak deze aan)
3. Klik met rechts op de map > "Delen"
4. Voer het e-mailadres van het serviceaccount in (uit stap 5)
5. Kies "Lezer" als rol
6. Klik op "Verzenden"

### 7. Map-ID ophalen

1. Open de gedeelde map in Google Drive
2. De URL ziet er zo uit: `https://drive.google.com/drive/folders/JOUW_MAP_ID`
3. Kopieer het gedeelte na `/folders/` - dat is je map-ID
4. Voeg toe aan `.env.local`:

```
GOOGLE_DRIVE_FOLDER_ID=JOUW_MAP_ID
```

### 8. Testen

Start de app en ga naar de Overleggen-pagina. Bij het koppelen van Drive-bestanden aan een overleg zou je de bestanden uit de map moeten zien.

## Troubleshooting

- **Geen bestanden zichtbaar?** Controleer of de map is gedeeld met het serviceaccount.
- **Authenticatiefout?** Controleer of de private key correct is overgenomen, inclusief de `\n` regelovergangen.
- **API niet ingeschakeld?** Ga naar de Google Cloud Console en controleer of de Google Drive API is ingeschakeld.
