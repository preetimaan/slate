import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { cardExtensions } from './extensions'
import { cardStore, EMPTY_DOC } from './cardStore'
import { editorRegistry } from './editorRegistry'

export const MIN_CARD_HEIGHT = 56

interface CardViewProps {
  cardId: string
  elementId: string
  active: boolean
  readOnly: boolean
  /** Card content grew/shrank: ask the board to resize the element (scene units). */
  onHeight: (elementId: string, height: number) => void
}

export function CardView({ cardId, elementId, active, readOnly, onHeight }: CardViewProps) {
  const card = useSyncExternalStore(cardStore.subscribe, () => cardStore.get(cardId))
  const innerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor(
    {
      extensions: cardExtensions,
      content: cardStore.get(cardId)?.content ?? EMPTY_DOC,
      editable: !readOnly,
      onUpdate: ({ editor }) => cardStore.update(cardId, { content: editor.getJSON() }),
    },
    [cardId],
  )

  // Let the toolbar find this editor
  useEffect(() => {
    if (!editor) return
    editorRegistry.set(cardId, editor)
    return () => editorRegistry.remove(cardId, editor)
  }, [cardId, editor])

  useEffect(() => {
    if (editor && editor.isEditable === readOnly) editor.setEditable(!readOnly)
  }, [editor, readOnly])

  // Excalidraw activates the card after the click, so the click itself never
  // reaches the editor. Put the caret at the end when the card becomes active.
  useEffect(() => {
    if (active && editor && !readOnly && !editor.isFocused) {
      editor.commands.focus('end')
    }
  }, [active, editor, readOnly])

  // Auto-height: the card grows/shrinks with its content. Width stays user-controlled.
  // offsetHeight is pre-transform, so it's already in scene units regardless of zoom.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const report = () => onHeight(elementId, Math.max(MIN_CARD_HEIGHT, Math.ceil(el.offsetHeight)))
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [elementId, onHeight])

  const color = card?.color ?? 'yellow'

  return (
    <div
      className={`sl-card sl-card--${color}${active ? ' is-active' : ''}${readOnly ? ' is-readonly' : ''}`}
      data-card-id={cardId}
    >
      <div ref={innerRef} className="sl-card__inner">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
