/**
 * Herbruikbare functie om een Trello kaart aan te maken.
 * Kan worden aangeroepen vanuit elke client component.
 * Stuurt de kaart standaard naar de Inbox lijst.
 */
export async function createTrelloCard(options: {
  name: string
  description?: string
  idList?: string
}): Promise<{ success: boolean; card?: { id: string; name: string; url: string }; error?: string }> {
  try {
    const res = await fetch('/api/trello/create-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Kaart aanmaken mislukt.' }
    }

    return { success: true, card: data.card }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
