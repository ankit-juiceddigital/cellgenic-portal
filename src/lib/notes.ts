// File: src/lib/notes.ts
// Saves and retrieves client follow-up notes via WordPress custom endpoint.
// Notes are stored as WordPress custom post type entries.

import type { Note } from '@/types'

const WP_URL = process.env.NEXT_PUBLIC_WP_URL

export async function getNotes(token: string, clientId: number): Promise<Note[]> {
  const res = await fetch(
    `${WP_URL}/wp-json/cellgenic/v1/notes?client_id=${clientId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  return res.json()
}

export async function saveNote(
  token: string,
  note: { clientId: number; text: string; type: Note['type']; author: string }
): Promise<Note> {
  const res = await fetch(`${WP_URL}/wp-json/cellgenic/v1/notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: note.clientId,
      text: note.text,
      type: note.type,
      author: note.author,
    }),
  })
  if (!res.ok) throw new Error('Failed to save note.')
  return res.json()
}

export async function deleteNote(token: string, noteId: string): Promise<void> {
  await fetch(`${WP_URL}/wp-json/cellgenic/v1/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
