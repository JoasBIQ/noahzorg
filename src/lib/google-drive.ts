import { google } from 'googleapis'

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  return google.drive({ version: 'v3', auth })
}

export async function listDriveFiles(query?: string) {
  const drive = getDriveClient()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!folderId) {
    return []
  }

  let q = `'${folderId}' in parents and trashed = false`
  if (query) {
    q += ` and name contains '${query.replace(/'/g, "\\'")}'`
  }

  const response = await drive.files.list({
    q,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, webContentLink)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  })

  return response.data.files || []
}

export async function getDriveFile(fileId: string) {
  const drive = getDriveClient()

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, modifiedTime, webViewLink, webContentLink',
  })

  return response.data
}
