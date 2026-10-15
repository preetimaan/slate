/**
 * The TipTap schema for note cards. In Phase 1 this moves to `packages/richtext`
 * so Slate and Logbook share exactly the same document format.
 */
import StarterKit from '@tiptap/starter-kit'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'

export const cardExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
    // Allow ticking checkboxes in view mode (phone reading)
    onReadOnlyChecked: () => true,
  }),
  TableKit.configure({ table: { resizable: false } }),
  TextStyle,
  FontSize,
  Placeholder.configure({ placeholder: 'Write something…' }),
]

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40]
export const DEFAULT_FONT_SIZE = 16
