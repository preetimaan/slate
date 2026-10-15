import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { CaptureUpdateAction, Excalidraw } from '@excalidraw/excalidraw'
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
  LibraryItems,
} from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'

import { CardView } from './cards/CardView'
import { CardToolbar } from './cards/CardToolbar'
import { cardStore, emptyCard, newId } from './cards/cardStore'
import { editorRegistry } from './cards/editorRegistry'
import {
  CARD_LINK,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_CARD_WIDTH,
  cardIdOf,
  createCardElement,
  isCardElement,
  withChanges,
  type SceneElement,
} from './board/elements'
import { buildPageFile, loadPage, resetBoard, saveLibrary, savePage, type PageFile } from './board/persistence'

type SaveState = 'saved' | 'pending' | 'error'

const SAVE_DELAY_MS = 800
const isNarrow = () => window.matchMedia('(max-width: 768px)').matches

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="3" />
    <line x1="8" y1="1" x2="8" y2="3" />
    <line x1="8" y1="13" x2="8" y2="15" />
    <line x1="1" y1="8" x2="3" y2="8" />
    <line x1="13" y1="8" x2="15" y2="8" />
    <line x1="3.1" y1="3.1" x2="4.5" y2="4.5" />
    <line x1="11.5" y1="11.5" x2="12.9" y2="12.9" />
    <line x1="12.9" y1="3.1" x2="11.5" y2="4.5" />
    <line x1="4.5" y1="11.5" x2="3.1" y2="12.9" />
  </svg>
)

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="5.5" y1="2" x2="5.5" y2="14" />
    <line x1="10.5" y1="2" x2="10.5" y2="14" />
    <line x1="2" y1="5.5" x2="14" y2="5.5" />
    <line x1="2" y1="10.5" x2="14" y2="10.5" />
  </svg>
)

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
)

const IconPencil = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.5 2.5l2 2-8 8H3v-3l8-8z" />
  </svg>
)

export default function App() {
  const initial = useMemo(() => loadPage(), [])
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const pageRef = useRef<PageFile>(initial.page)
  const filesRef = useRef<BinaryFiles>(initial.files)
  const saveTimer = useRef<number | undefined>(undefined)
  const lastSignature = useRef('')

  const [viewMode, setViewMode] = useState(isNarrow)
  const [theme, setTheme] = useState<'light' | 'dark'>(initial.page.scene.appState.theme)
  const [gridEnabled, setGridEnabled] = useState(initial.page.scene.appState.gridModeEnabled)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [showJson, setShowJson] = useState(false)

  // ---- saving -------------------------------------------------------------

  const saveNow = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    const page = buildPageFile(pageRef.current, api.getSceneElementsIncludingDeleted(), api.getAppState())
    pageRef.current = page
    setSaveState(savePage(page, filesRef.current) ? 'saved' : 'error')
  }, [])

  const scheduleSave = useCallback(() => {
    setSaveState(s => (s === 'pending' ? s : 'pending'))
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(saveNow, SAVE_DELAY_MS)
  }, [saveNow])

  // Card text changes don't go through Excalidraw, so listen to the card store too.
  useEffect(() => cardStore.subscribe(scheduleSave), [scheduleSave])

  // Flush on tab close / backgrounding (phones)
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current !== undefined) {
        window.clearTimeout(saveTimer.current)
        saveNow()
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [saveNow])

  // ---- card bookkeeping ---------------------------------------------------

  /**
   * Copy/paste or Alt+drag duplicates an element together with its cardId.
   * Give each duplicate its own copy of the card so edits don't leak between them.
   */
  const fixCardIds = useCallback((elements: readonly SceneElement[]) => {
    const seen = new Set<string>()
    const remap = new Map<string, string>()
    for (const el of elements) {
      if (el.isDeleted || !isCardElement(el)) continue
      const id = cardIdOf(el)
      if (seen.has(id)) {
        const copyId = newId()
        cardStore.upsert(copyId, structuredClone(cardStore.get(id) ?? emptyCard()))
        remap.set(el.id, copyId)
      } else {
        seen.add(id)
        if (!cardStore.has(id)) cardStore.upsert(id, emptyCard())
      }
    }
    if (remap.size === 0) return
    queueMicrotask(() => {
      const api = apiRef.current
      if (!api) return
      api.updateScene({
        elements: api
          .getSceneElementsIncludingDeleted()
          .map(el =>
            remap.has(el.id) ? withChanges(el, { customData: { ...el.customData, cardId: remap.get(el.id) } }) : el,
          ),
        captureUpdate: CaptureUpdateAction.NEVER,
      })
    })
  }, [])

  const onCardHeight = useCallback((elementId: string, height: number) => {
    const api = apiRef.current
    if (!api) return
    const elements = api.getSceneElementsIncludingDeleted()
    const target = elements.find(el => el.id === elementId)
    if (!target || Math.abs(target.height - height) < 2) return
    api.updateScene({
      elements: elements.map(el => (el.id === elementId ? withChanges(el, { height }) : el)),
      captureUpdate: CaptureUpdateAction.NEVER,
    })
  }, [])

  // ---- Excalidraw callbacks -----------------------------------------------

  const onChange = useCallback(
    (elements: readonly SceneElement[], appState: AppState, files: BinaryFiles) => {
      filesRef.current = files

      const ae = appState.activeEmbeddable
      const nextActive = ae && ae.state === 'active' && isCardElement(ae.element) ? cardIdOf(ae.element) : null
      setActiveCardId(prev => (prev === nextActive ? prev : nextActive))
      setTheme(prev => (prev === appState.theme ? prev : appState.theme))
      setGridEnabled(prev => {
        const next = appState.gridModeEnabled ?? false
        return prev === next ? prev : next
      })

      // Auto-lock every tool except the selection/pointer tool so it stays active after drawing.
      const tool = appState.activeTool
      if (!tool.locked && tool.type !== 'selection') {
        queueMicrotask(() => {
          apiRef.current?.updateScene({
            appState: { activeTool: { ...tool, locked: true } },
            captureUpdate: CaptureUpdateAction.NEVER,
          })
        })
      }

      // Hide Excalidraw's link popup when a card is selected (it would show "slate://card")
      const selected = Object.keys(appState.selectedElementIds).filter(id => appState.selectedElementIds[id])
      const cardSelected =
        selected.length === 1 && elements.some(el => el.id === selected[0] && !el.isDeleted && isCardElement(el))
      document.body.classList.toggle('sl-card-selected', cardSelected)

      fixCardIds(elements)

      // onChange also fires on pointer moves; only save when something saveable changed
      let sum = 0
      for (const el of elements) sum += el.version
      const signature = [
        sum,
        elements.length,
        Object.keys(files).length,
        Math.round(appState.scrollX),
        Math.round(appState.scrollY),
        appState.zoom.value,
        appState.viewBackgroundColor,
        appState.theme,
        appState.gridModeEnabled,
      ].join('|')
      if (signature !== lastSignature.current) {
        lastSignature.current = signature
        scheduleSave()
      }
    },
    [fixCardIds, scheduleSave],
  )

  const renderEmbeddable = useCallback<NonNullable<ExcalidrawProps['renderEmbeddable']>>(
    (element, appState) => {
      if (!isCardElement(element)) return null // normal web embeds keep working
      const cardId = cardIdOf(element)
      const active = appState.activeEmbeddable?.element === element && appState.activeEmbeddable.state === 'active'
      return (
        <CardView
          cardId={cardId}
          elementId={element.id}
          active={active}
          readOnly={viewMode}
          onHeight={onCardHeight}
        />
      )
    },
    [viewMode, onCardHeight],
  )

  const validateEmbeddable = useCallback((link: string) => (link.startsWith(CARD_LINK) ? true : undefined), [])

  const onLinkOpen = useCallback<NonNullable<ExcalidrawProps['onLinkOpen']>>((element, event) => {
    if (element.link?.startsWith(CARD_LINK)) event.preventDefault()
  }, [])

  // ---- actions ------------------------------------------------------------

  const addCard = useCallback(() => {
    const api = apiRef.current
    if (!api) return
    setViewMode(false)
    const s = api.getAppState()
    const z = s.zoom.value
    // centre of the visible area, in scene coordinates
    const x = -s.scrollX + s.width / (2 * z) - DEFAULT_CARD_WIDTH / 2
    const y = -s.scrollY + s.height / (2 * z) - DEFAULT_CARD_HEIGHT / 2
    const cardId = newId()
    cardStore.upsert(cardId, emptyCard())
    const el = createCardElement(cardId, x, y)
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), el],
      appState: {
        selectedElementIds: { [el.id]: true },
        activeEmbeddable: { element: el as never, state: 'active' },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    })
  }, [])

  const toggleGrid = useCallback(() => {
    apiRef.current?.updateScene({
      appState: { gridModeEnabled: !gridEnabled },
      captureUpdate: CaptureUpdateAction.NEVER,
    })
  }, [gridEnabled])

  const onReset = useCallback(() => {
    if (!window.confirm('Clear this test board and start over?')) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = undefined
    resetBoard()
    window.location.reload()
  }, [])

  // ---- toolbar wiring -----------------------------------------------------

  const activeEditor = useSyncExternalStore(editorRegistry.subscribe, () => editorRegistry.get(activeCardId))

  const pageJson = showJson ? JSON.stringify(pageRef.current, null, 2) : ''

  return (
    <div className={`sl-app${theme === 'dark' ? ' is-dark' : ''}${viewMode ? ' is-view' : ''}`}>
      <header className="sl-header">
        <div className="sl-header__title">
          <strong>Slate</strong>
          <span className="sl-header__sub">Phase 0</span>
        </div>

        <div className="sl-header__center">
          {activeCardId && activeEditor && !viewMode ? (
            <CardToolbar key={activeCardId} editor={activeEditor} cardId={activeCardId} />
          ) : (
            <span className="sl-header__hint">
              {viewMode ? 'View mode — pan, zoom, tick checkboxes' : 'Tip: click the middle of a card to edit it'}
            </span>
          )}
        </div>

        <div className="sl-header__actions">
          <span className={`sl-save sl-save--${saveState}`} title="Saved in this browser only (Phase 0)">
            {saveState === 'saved' ? 'Saved' : saveState === 'pending' ? 'Saving…' : 'Not saved — storage full?'}
          </span>
          <button type="button" className="sl-btn sl-btn--primary" onClick={addCard}>
            + Card
          </button>
          <button
            type="button"
            className="sl-btn sl-btn--icon"
            data-tooltip={theme === 'light' ? 'Dark mode' : 'Light mode'}
            onClick={() =>
              apiRef.current?.updateScene({
                appState: { theme: theme === 'light' ? 'dark' : 'light' },
                captureUpdate: CaptureUpdateAction.NEVER,
              })
            }
          >
            {theme === 'light' ? <IconMoon /> : <IconSun />}
          </button>
          <button
            type="button"
            className={`sl-btn sl-btn--icon${gridEnabled ? ' sl-btn--active' : ''}`}
            data-tooltip={gridEnabled ? 'Hide grid' : 'Show grid'}
            onClick={toggleGrid}
          >
            <IconGrid />
          </button>
          <button
            type="button"
            className="sl-btn sl-btn--icon"
            data-tooltip={viewMode ? 'Switch to edit' : 'Switch to view'}
            onClick={() => setViewMode(v => !v)}
          >
            {viewMode ? <IconPencil /> : <IconEye />}
          </button>
          <button
            type="button"
            className="sl-btn"
            onClick={() => {
              saveNow()
              setShowJson(true)
            }}
          >
            {'{ }'}
          </button>
        </div>
      </header>

      <main className="sl-canvas">
        <Excalidraw
          excalidrawAPI={api => {
            apiRef.current = api
          }}
          initialData={{
            elements: initial.page.scene.elements,
            appState: initial.page.scene.appState as unknown as Partial<AppState>,
            files: initial.files,
            libraryItems: initial.library,
            scrollToContent: false,
          }}
          viewModeEnabled={viewMode}
          onChange={onChange}
          onLibraryChange={(items: LibraryItems) => saveLibrary(items)}
          renderEmbeddable={renderEmbeddable}
          validateEmbeddable={validateEmbeddable}
          onLinkOpen={onLinkOpen}
          UIOptions={{ canvasActions: { loadScene: false } }}
        />
      </main>

      {showJson && (
        <div className="sl-modal" role="dialog" aria-label="Page file" onClick={() => setShowJson(false)}>
          <div className="sl-modal__panel" onClick={e => e.stopPropagation()}>
            <div className="sl-modal__head">
              <strong>Page file</strong>
              <span className="sl-modal__note">
                Card text lives in <code>cards</code>; canvas elements only point to it via{' '}
                <code>customData.cardId</code>.
              </span>
              <button type="button" className="sl-btn" onClick={() => navigator.clipboard?.writeText(pageJson)}>
                Copy
              </button>
              <button type="button" className="sl-btn sl-btn--danger" onClick={onReset}>
                Reset board
              </button>
              <button type="button" className="sl-btn" onClick={() => setShowJson(false)}>
                Close
              </button>
            </div>
            <pre className="sl-modal__body">{pageJson}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
