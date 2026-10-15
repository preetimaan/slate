/** Tracks the live TipTap editor for each mounted card so the toolbar can drive it. */
import type { Editor } from '@tiptap/core'

const editors = new Map<string, Editor>()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(l => l())
}

export const editorRegistry = {
  get(cardId: string | null): Editor | null {
    return cardId ? editors.get(cardId) ?? null : null
  },
  set(cardId: string, editor: Editor) {
    editors.set(cardId, editor)
    emit()
  },
  remove(cardId: string, editor: Editor) {
    if (editors.get(cardId) === editor) {
      editors.delete(cardId)
      emit()
    }
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
