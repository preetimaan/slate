import { useState, useSyncExternalStore, type ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { CARD_COLORS, cardStore, type CardColor } from './cardStore'
import { DEFAULT_FONT_SIZE, FONT_SIZES } from './extensions'

interface Props {
  editor: Editor
  cardId: string
}

/** Keeps focus (and the selection) in the card when a toolbar button is pressed. */
const keepFocus = (e: React.MouseEvent) => e.preventDefault()

function Btn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`sl-tb__btn${active ? ' is-on' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function currentSize(raw: unknown): number {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) ? n : DEFAULT_FONT_SIZE
}

export function CardToolbar({ editor, cardId }: Props) {
  const [linkDraft, setLinkDraft] = useState<string | null>(null)

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      p: e.isActive('paragraph'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
      table: e.isActive('table'),
      link: e.isActive('link'),
      href: (e.getAttributes('link').href as string | undefined) ?? '',
      size: currentSize(e.getAttributes('textStyle').fontSize),
    }),
  })

  const color = useSyncExternalStore(cardStore.subscribe, () => cardStore.get(cardId)?.color ?? 'yellow')
  const chain = () => editor.chain().focus()

  const stepSize = (dir: 1 | -1) => {
    const i = FONT_SIZES.indexOf(s.size)
    const idx = i === -1 ? FONT_SIZES.indexOf(DEFAULT_FONT_SIZE) : i
    const next = FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, idx + dir))]
    if (next === DEFAULT_FONT_SIZE) chain().unsetFontSize().run()
    else chain().setFontSize(`${next}px`).run()
  }

  const applyLink = () => {
    const href = (linkDraft ?? '').trim()
    if (href) chain().extendMarkRange('link').setLink({ href }).run()
    else chain().extendMarkRange('link').unsetLink().run()
    setLinkDraft(null)
  }

  return (
    <div className="sl-tb" role="toolbar" aria-label="Card formatting">
      <div className="sl-tb__group">
        <Btn title="Normal text" active={s.p} onClick={() => chain().setParagraph().run()}>
          T
        </Btn>
        <Btn title="Heading 1" active={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
          H1
        </Btn>
        <Btn title="Heading 2" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          H2
        </Btn>
        <Btn title="Heading 3" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          H3
        </Btn>
      </div>

      <div className="sl-tb__group">
        <Btn title="Smaller text" onClick={() => stepSize(-1)}>
          A−
        </Btn>
        <span className="sl-tb__size" title="Font size">
          {s.size}
        </span>
        <Btn title="Bigger text" onClick={() => stepSize(1)}>
          A+
        </Btn>
      </div>

      <div className="sl-tb__group">
        <Btn title="Bold (⌘B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </Btn>
        <Btn title="Italic (⌘I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </Btn>
        <Btn title="Underline (⌘U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
          <u>U</u>
        </Btn>
        <Btn title="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}>
          <s>S</s>
        </Btn>
      </div>

      <div className="sl-tb__group">
        <Btn title="Bullet list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
          •≡
        </Btn>
        <Btn title="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
          1≡
        </Btn>
        <Btn title="Checklist" active={s.task} onClick={() => chain().toggleTaskList().run()}>
          ☑
        </Btn>
      </div>

      <div className="sl-tb__group">
        {!s.table ? (
          <Btn
            title="Insert table (3×3)"
            onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            ▦
          </Btn>
        ) : (
          <>
            <Btn title="Add row below" onClick={() => chain().addRowAfter().run()}>
              +Row
            </Btn>
            <Btn title="Add column right" onClick={() => chain().addColumnAfter().run()}>
              +Col
            </Btn>
            <Btn title="Delete row" onClick={() => chain().deleteRow().run()}>
              −Row
            </Btn>
            <Btn title="Delete column" onClick={() => chain().deleteColumn().run()}>
              −Col
            </Btn>
            <Btn title="Delete table" onClick={() => chain().deleteTable().run()}>
              ✕▦
            </Btn>
          </>
        )}
      </div>

      <div className="sl-tb__group">
        {linkDraft === null ? (
          <Btn
            title={s.link ? 'Edit link' : 'Add link'}
            active={s.link}
            onClick={() => setLinkDraft(s.href)}
          >
            🔗
          </Btn>
        ) : (
          <form
            className="sl-tb__link"
            onSubmit={e => {
              e.preventDefault()
              applyLink()
            }}
          >
            <input
              autoFocus
              type="url"
              inputMode="url"
              placeholder="https://…  (empty = remove)"
              value={linkDraft}
              onChange={e => setLinkDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setLinkDraft(null)
                  editor.commands.focus()
                }
              }}
            />
            <button type="submit" className="sl-tb__btn">
              OK
            </button>
          </form>
        )}
        <Btn title="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
          ⌫
        </Btn>
      </div>

      <div className="sl-tb__group sl-tb__colors">
        {CARD_COLORS.map((c: CardColor) => (
          <button
            key={c}
            type="button"
            className={`sl-tb__swatch sl-swatch--${c}${c === color ? ' is-on' : ''}`}
            title={`Card colour: ${c}`}
            aria-label={`Card colour: ${c}`}
            onMouseDown={keepFocus}
            onClick={() => cardStore.update(cardId, { color: c })}
          />
        ))}
      </div>
    </div>
  )
}
