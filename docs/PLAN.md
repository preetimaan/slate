# Slate — Project Plan

> Running design doc. Lives at `docs/PLAN.md` in the repo. Update the **Decision log** whenever something is decided or changed.

_Last updated: 2026-10-15_ · Phase 0 in progress

---

## 1. What this is

A personal, self-built alternative to OneNote: an **Excalidraw-style infinite whiteboard** for dumping text, lists, notes, small sketches, stickers and occasional images, then dragging them around to organize ideas at a high level. Signed in with **Google**, stored in the user's own **Google Drive**. No backend database.

Later it shares infrastructure with a separate diary/journal app, **Logbook** (today's `reflection-diary` repo: entries per date, auto-linked by date), without the two apps being merged.

### Goals (current scope)
- Board pages: infinite canvas, zoom, move anything anywhere
- Short rich-text note cards: headings, font size, bold/italic, lists, checklists, small tables, links
- Excalidraw tools: shapes, arrows, freehand ink, images, stickers
- Find & replace within a board; search across a notebook
- Collapsible tree: Notebooks → Sections → Pages
- Desktop for editing, mobile mostly for viewing
- Online only

### Non-goals (for now)
- Doc pages (planned later)
- Handwriting → text (planned later)
- Journal app integration (planned later — only keep hooks)
- Sharing / real-time collaboration
- Web clipping, attachments, link previews
- Offline mode
- Regex search

---

## 2. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Static SPA, no backend DB; Google Drive is storage | Free, simple, data stays in user's Drive |
| 2026-10-09 | Google Identity Services token flow, `drive.file` scope | Non-sensitive scope → no Google security review for a few extra users |
| 2026-10-09 | Canvas-first (board) pages; per-page type choice reserved for later doc pages | Matches "dump & organize" workflow |
| 2026-10-09 | Excalidraw (MIT) as canvas engine | Desired hand-drawn look, no license key/watermark |
| 2026-10-09 | Rich text via TipTap rendered inside Excalidraw embeddables (`renderEmbeddable`) | Excalidraw text is plain; this is the integration point — **validate in Phase 0** |
| 2026-10-09 | Card content stored outside Excalidraw elements (`cards` map), linked via `customData.cardId` | Keeps logic/data decoupled from the view; reusable by docs & journal |
| 2026-10-09 | Monorepo with `core` / `storage` / `auth` / `richtext` / `images` packages + `apps/slate` | Logbook can reuse everything except views |
| 2026-10-09 | One Google Cloud project + one OAuth client shared by Slate and Logbook | `drive.file` only sees files created by the same OAuth client |
| 2026-10-09 | Host on Netlify with own domain; code on GitHub | Already available; Netlify Functions available later for handwriting |
| 2026-10-09 | Shrink large images client-side | Scratch pad, not a photo app; keeps mobile fast |
| 2026-10-09 | Note cards are short; long content will go to doc pages later | Keeps board light and cards simple |
| 2026-10-10 | Focus on board pages only; doc pages and handwriting later | Ship the core scratch-pad first |
| 2026-10-10 | Tailwind v4 for styling | Same as journal app, shared UI later |
| 2026-10-10 | `richtext` package must read TipTap HTML and JSON | Journal stores HTML today; it moves to JSON later |
| 2026-10-10 | Names: **Slate** (board app), **Logbook** (journal app) | Chosen by owner |
| 2026-10-15 | Renamed app from Doodlewall → Slate | Better fit for the app's tone and purpose |
| 2026-10-10 | Logbook will also use Google Drive (its Firebase plan was a placeholder) | One storage backend, one OAuth client, shared `storage` package |
| 2026-10-10 | pnpm workspaces | Fast, strict workspaces; Logbook switches from npm when it joins |
| 2026-10-10 | Each app gets its own Drive root folder (`Slate/`, `Logbook/`) | Clear separation in Drive; cross-links work because both use the same OAuth client |
| 2026-10-10 | Repo `slate` next to `reflection-diary`; Phase 0 lives in `prototypes/phase0-board`, saves to localStorage only | Throwaway; Phase 1 starts clean in `apps/` + `packages/` |
| 2026-10-10 | Logbook repo placement decided later | Not needed until boards ship |

---

## 3. Architecture

**Rule: the brain (data + logic) never imports UI code.** Only `apps/*` know about React or Excalidraw.

```
packages/
  core/       Pure TypeScript domain: Notebook, Section, Page, Card, Asset, Tag, Link.
              Commands (create/move/rename/delete), manifest/tree ops,
              search index, find & replace, link resolver,
              schema versions + migrations.
  storage/    StorageProvider interface
              ├─ GoogleDriveProvider (real)
              └─ MemoryProvider (tests)
  auth/       Google sign-in, token acquisition & silent refresh
  richtext/   Shared TipTap schema + extensions, rich text → plain text,
              text match/replace inside rich-text JSON
  images/     Resize / compress / strip EXIF before upload
apps/
  slate/ React UI: tree sidebar, board view (Excalidraw), card editor, search UI
  (logbook/)  Later, possibly: reuses packages above
```

### Tech stack
- Vite + React + TypeScript (matches journal app)
- Tailwind CSS v4 (matches journal app)
- pnpm workspaces monorepo
- `@excalidraw/excalidraw` (board renderer)
- TipTap / ProseMirror (rich text)
- MiniSearch (in-memory search index)
- Vitest (unit tests on `core`, `richtext`, `storage` via MemoryProvider)
- Netlify (hosting, later Functions)

### StorageProvider interface (sketch)
```ts
interface StorageProvider {
  readManifest(): Promise<Manifest>
  writeManifest(m: Manifest, expectedVersion?: string): Promise<Version>
  readPage(id: PageId): Promise<{ page: PageFile; version: Version }>
  writePage(page: PageFile, expectedVersion?: Version): Promise<Version> // throws ConflictError
  deletePage(id: PageId): Promise<void>            // moves to Drive trash, never hard-delete
  putAsset(blob: Blob, meta: AssetMeta): Promise<AssetId>
  getAsset(id: AssetId): Promise<Blob>
}
```

---

## 4. Data model

### Page file (`*.board.json`, one Drive file per page)
```json
{
  "schema": 1,
  "id": "01JA...",
  "type": "board",
  "title": "Q4 ideas",
  "tags": ["work"],
  "links": [
    { "to": "page:01JB..." },
    { "to": "date:2026-10-09" }
  ],
  "cards": {
    "c1": { "content": { "type": "doc", "content": [] } }
  },
  "scene": {
    "elements": [],
    "appState": { "zoom": 1, "scrollX": 0, "scrollY": 0, "viewBackgroundColor": "#fff" }
  },
  "assets": ["a1"],
  "createdAt": "2026-10-09T10:00:00Z",
  "updatedAt": "2026-10-09T10:00:00Z"
}
```

- **Own IDs** (ULIDs), never Drive file IDs, in content. Mapping stored in Drive `appProperties` + manifest.
- **Cards** hold TipTap JSON. Excalidraw elements reference them with `customData.cardId`.
- **Typed links**: `page:`, `date:` now; `journal:`, `doc:` later. `date:` links are the hook for journal auto-linking.
- **`schema`** version + migrations in `core`.

### Manifest (`_app/manifest.json`)
Tree (notebooks → sections → pages), ordering, titles, tags, page → Drive file ID map, light index metadata.

---

## 5. Google Drive layout

```
Slate/
  _app/manifest.json
  _app/stickers.json        Excalidraw library format
  _assets/                  shrunk images
  <notebook>/<section>/<page>.board.json

Logbook/                    later, same structure ideas (_app, _assets, entries by date)
```

- Each page save also writes plain text into Drive `contentHints.indexableText` (bonus: findable in Drive search).
- Deletes go to Drive trash only.

---

## 6. Auth

- Google Identity Services token client in the browser; no refresh tokens, silent re-request when the ~1h token expires.
- Scope: `https://www.googleapis.com/auth/drive.file`
- One Google Cloud project, one OAuth client; authorized JS origins: `slate.<domain>` (+ `logbook.<domain>` later, + `localhost` for dev).
- Phase 1: consent screen in Testing with own account. Phase "Others": publish to production (non-sensitive scope).

---

## 7. Board UX

- **Tree sidebar**: collapsible Notebooks → Sections → Pages; drag to reorder/move; drawer on mobile.
- **Canvas**: all Excalidraw tools, zoom, dark theme.
- **Quick text**: native Excalidraw text (labels, one-liners).
- **Note cards**: short TipTap cards; selection toolbar for heading level, font size, bold/italic, bullet/numbered lists, checklists, small tables, links. Click to edit, drag by frame to move.
- **Stickers**: Excalidraw library (import from libraries.excalidraw.com or save own scribbles), synced to `stickers.json`.
- **Images**: if longest edge > 1600px **or** size > 400 KB → resize to ≤1600px, WebP q≈0.8, strip EXIF. Thresholds configurable.
- **Saving**: debounced autosave (~2s idle), local draft cache in IndexedDB for crash safety, version check → conflict warning instead of silent overwrite.
- **Mobile**: opens in view mode with pan/zoom and "fit to content"; edit toggle available.

---

## 8. Search

- **Within a board**: find across native text + card content; highlight and scroll/zoom to each match; replace one / replace all. Plain text, case-insensitive default, no regex.
- **Across a notebook**: find only; in-memory MiniSearch index built from page text; click result → open page, zoom to match.

---

## 9. Phases

### Phase 0 — Prototype (throwaway)
- [x] Excalidraw + TipTap note cards via `renderEmbeddable` (`prototypes/phase0-board`, see `docs/PHASE0.md`)
- [ ] Test: edit text, drag, resize, zoom, select-to-format
- [ ] Test on phone: pan/zoom, view mode, tap to edit
- [ ] Decide: embeddable approach vs. custom overlay fallback

### Phase 1 — Foundation
- [ ] Monorepo scaffold (pnpm, Vite, TS, Vitest)
- [ ] `core` model + manifest ops + tests
- [ ] `storage` interface, MemoryProvider, GoogleDriveProvider
- [ ] `auth` with Google Identity Services
- [ ] Google Cloud project + OAuth client
- [ ] Netlify deploy on `slate.<domain>`
- [ ] Tree sidebar (collapsible)

### Phase 2 — Boards
- [ ] Board view with Excalidraw
- [ ] Note cards (formatting toolbar)
- [ ] Autosave + conflict check + local draft cache
- [ ] Images with shrinking (`images` package)
- [ ] Stickers library synced to Drive

### Phase 3 — Search
- [ ] Find & replace within board
- [ ] Notebook-wide search

### Phase 4 — Polish
- [ ] Mobile view mode
- [ ] Dark theme
- [ ] Tags
- [ ] Cross-page links

### Later
- [ ] Doc pages + "Send to doc" from board selection
- [ ] Handwriting → text (Netlify Function + vision API)
- [ ] Logbook on shared packages (date links)
- [ ] Publish OAuth consent for other users

---

## 10. Journal app: Logbook (`reflection-diary`, reviewed 2026-10-10)

Repo: `github.com/preetimaan/reflection-diary`. Stays a separate app; listed here only to keep the shared infra compatible.

**What already lines up**
- Same stack: React 19 + Vite + TypeScript + TipTap v3 → the `richtext` package can be shared directly.
- Media stored separately from text and referenced by ID (`floatingImage` node with `mediaId`) → same idea as `_assets/`.
- Entries keyed by `date` (`YYYY-MM-DD`) → matches the `date:` link type.
- Tags are plain string arrays → same as boards.
- Already has stickers and a planned handwriting canvas → can reuse the board's drawing pieces later.

**Where it differs (to resolve before the journal moves onto shared packages)**
| Topic | Journal today | Board plan | Proposed resolution |
|---|---|---|---|
| Cloud storage | Firebase in README (placeholder only) | Google Drive, `drive.file` | **Decided:** Drive for both, behind the shared `StorageProvider`. |
| Offline | Local-first (Dexie/IndexedDB), offline sync planned | Online only | Keep Dexie as the journal's local cache, Drive as its sync target. Boards stay online-only. |
| Rich text format | TipTap **HTML** string | TipTap **JSON** | **Decided:** journal moves to JSON later; `richtext` reads both meanwhile. |
| IDs | Dexie auto-increment numbers | ULIDs | Assign ULIDs at migration. |
| Package manager | npm | pnpm | **Decided:** pnpm; Logbook switches when it joins the shared packages. |
| Styling | Tailwind v4 | not chosen | Use Tailwind v4 in the board app too for shared UI. |
| Text extraction | `stripHtml` regex | — | Replace with `richtext` text extraction (handles JSON + HTML). |

**Possible future layout:** journal moves into the monorepo as `apps/logbook`, or stays in its own repo and consumes the packages. Not decided; no work on this until boards ship.

---

## 11. Open questions

- [x] ~~App name~~ → Slate (repo `slate`, `slate.<domain>`, Drive `Slate/`); journal → Logbook
- [x] ~~Existing journal app: stack, data location, data format~~ → see section 10
- [x] ~~Journal cloud storage~~ → Drive
- [x] ~~Package manager~~ → pnpm
- [ ] Monorepo includes journal later, or journal stays separate and imports packages
- [ ] Phase 0 outcome: embeddable vs. overlay
