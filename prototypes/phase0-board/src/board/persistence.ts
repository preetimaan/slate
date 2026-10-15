/**
 * Phase 0 saves to localStorage only. The shape of `PageFile` is the one from
 * docs/PLAN.md, so Phase 1 can swap this module for the Google Drive provider.
 */
import type { AppState, BinaryFiles, LibraryItems } from '@excalidraw/excalidraw/types'
import { cardStore, newId, type Card } from '../cards/cardStore'
import { cardIdOf, createCardElement, isCardElement, type SceneElement } from './elements'

const PAGE_KEY = 'slate:phase0:page'
const FILES_KEY = 'slate:phase0:files'
const LIBRARY_KEY = 'slate:phase0:library'

export interface SavedAppState {
  scrollX: number
  scrollY: number
  zoom: { value: number }
  viewBackgroundColor: string
  theme: 'light' | 'dark'
  gridModeEnabled: boolean
}

export interface PageFile {
  schema: 1
  id: string
  type: 'board'
  title: string
  tags: string[]
  links: { to: string }[]
  cards: Record<string, Card>
  scene: {
    elements: SceneElement[]
    appState: SavedAppState
  }
  /** Image file IDs used on this page (blobs stored separately). */
  assets: string[]
  createdAt: string
  updatedAt: string
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // quota full, private mode, etc.
  }
}

/** Loads the page (or a starter page) and fills the card store. */
export function loadPage(): { page: PageFile; files: BinaryFiles; library: LibraryItems } {
  const page = read<PageFile>(PAGE_KEY) ?? starterPage()
  cardStore.load(page.cards)
  return {
    page,
    files: read<BinaryFiles>(FILES_KEY) ?? {},
    library: read<LibraryItems>(LIBRARY_KEY) ?? [],
  }
}

export function buildPageFile(
  previous: PageFile,
  elements: readonly SceneElement[],
  appState: AppState,
): PageFile {
  const live = elements.filter(el => !el.isDeleted)
  const cardIds = live.filter(isCardElement).map(cardIdOf)
  const assets = live
    .map(el => (el as { fileId?: string | null }).fileId)
    .filter((id): id is string => typeof id === 'string')

  return {
    ...previous,
    cards: cardStore.pick(cardIds),
    scene: {
      elements: live,
      appState: {
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: { value: appState.zoom.value },
        viewBackgroundColor: appState.viewBackgroundColor,
        theme: appState.theme === 'dark' ? 'dark' : 'light',
        gridModeEnabled: appState.gridModeEnabled ?? false,
      },
    },
    assets,
    updatedAt: new Date().toISOString(),
  }
}

/** Returns false if the browser refused to store it (usually: images filled the quota). */
export function savePage(page: PageFile, files: BinaryFiles): boolean {
  const used: BinaryFiles = {}
  for (const id of page.assets) if (files[id]) used[id] = files[id]
  const okPage = write(PAGE_KEY, page)
  const okFiles = write(FILES_KEY, used)
  return okPage && okFiles
}

export function saveLibrary(items: LibraryItems) {
  write(LIBRARY_KEY, items)
}

export function resetBoard() {
  try {
    localStorage.removeItem(PAGE_KEY)
    localStorage.removeItem(FILES_KEY)
  } catch {
    /* ignore */
  }
}

function text(t: string, marks?: { type: string }[]) {
  return marks ? { type: 'text', text: t, marks } : { type: 'text', text: t }
}

function task(label: string, checked = false) {
  return {
    type: 'taskItem',
    attrs: { checked },
    content: [{ type: 'paragraph', content: [text(label)] }],
  }
}

function starterPage(): PageFile {
  const welcomeId = newId()
  const ideasId = newId()
  const now = new Date().toISOString()

  const cards: Record<string, Card> = {
    [welcomeId]: {
      color: 'yellow',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [text('Phase 0 test board')] },
          {
            type: 'paragraph',
            content: [
              text('Click the '),
              text('middle', [{ type: 'bold' }]),
              text(' of a card to edit it. Drag it by its edge.'),
            ],
          },
          {
            type: 'taskList',
            content: [
              task('Type and format text (H1–H3, A−/A+)'),
              task('Make a checklist and tick it'),
              task('Insert a small table'),
              task('Zoom out, then back in'),
              task('Reload the page — it should all still be here'),
            ],
          },
        ],
      },
    },
    [ideasId]: {
      color: 'blue',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 3 }, content: [text('Ideas')] },
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [text('Drop sketches next to notes')] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [text('Group things into clusters')] }] },
            ],
          },
        ],
      },
    },
  }

  return {
    schema: 1,
    id: newId(),
    type: 'board',
    title: 'Phase 0 board',
    tags: [],
    links: [],
    cards,
    scene: {
      elements: [createCardElement(welcomeId, 80, 80, 360, 260), createCardElement(ideasId, 500, 120, 260, 140)],
      appState: { scrollX: 0, scrollY: 0, zoom: { value: 1 }, viewBackgroundColor: '#ffffff', theme: 'light', gridModeEnabled: false },
    },
    assets: [],
    createdAt: now,
    updatedAt: now,
  }
}
