/**
 * Card data lives here, NOT inside Excalidraw elements.
 * Excalidraw elements only point at a card via `customData.cardId`.
 * This is the seed of the future `core` package: search, replace,
 * doc pages and Logbook can all read cards without a canvas.
 */
import type { JSONContent } from '@tiptap/core'

export type CardColor = 'yellow' | 'pink' | 'blue' | 'green' | 'white'

export const CARD_COLORS: CardColor[] = ['yellow', 'pink', 'blue', 'green', 'white']

export interface Card {
  content: JSONContent
  color: CardColor
}

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

export function emptyCard(): Card {
  return { content: EMPTY_DOC, color: 'yellow' }
}

export function newId(): string {
  // ULIDs come in Phase 1 (core package); UUIDs are fine for the prototype.
  return crypto.randomUUID()
}

type Listener = () => void

const cards = new Map<string, Card>()
const listeners = new Set<Listener>()
let version = 0

function emit() {
  version++
  listeners.forEach(l => l())
}

export const cardStore = {
  get(id: string): Card | undefined {
    return cards.get(id)
  },

  has(id: string): boolean {
    return cards.has(id)
  },

  /** Replace everything (used on load). Does not notify. */
  load(record: Record<string, Card>) {
    cards.clear()
    for (const [id, card] of Object.entries(record)) cards.set(id, card)
  },

  upsert(id: string, card: Card) {
    cards.set(id, card)
    emit()
  },

  update(id: string, patch: Partial<Card>) {
    const current = cards.get(id) ?? emptyCard()
    cards.set(id, { ...current, ...patch })
    emit()
  },

  /** Cards referenced by `ids` only — used when saving, so deleted cards are pruned from the file. */
  pick(ids: Iterable<string>): Record<string, Card> {
    const out: Record<string, Card> = {}
    for (const id of ids) {
      const card = cards.get(id)
      if (card) out[id] = card
    }
    return out
  },

  version(): number {
    return version
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
