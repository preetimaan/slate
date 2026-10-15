# Phase 0: Board prototype

**Question to answer:** do rich-text note cards inside Excalidraw feel good enough to build on, or do we need the custom overlay fallback (see PLAN.md §2)?

Code: `prototypes/phase0-board/`. Throwaway: it saves to this browser only (localStorage), with no Google sign-in. Phase 1 starts fresh in `apps/slate` + `packages/*` and copies over what worked.

## Run it

```bash
pnpm install
pnpm dev          # desktop: http://localhost:5173
pnpm dev:lan      # phone on same Wi-Fi: open the "Network" URL
```

## How it works

- Each note card is an Excalidraw **embeddable** element with link `slate://card` and `customData.cardId`.
- `renderEmbeddable` draws a TipTap editor for that card instead of an iframe.
- Card content lives in a separate card store (`src/cards/cardStore.ts`), **not** in the Excalidraw element. Open the `{ }` button to see the page file: `cards` and `scene.elements` are separate.
- Cards grow and shrink in height with their content; you set the width.
- Copy/paste or Alt-drag a card → the copy gets its own card content.
- The formatting toolbar appears in the header while a card is being edited.

## Checklist

Tick these off and note anything that feels wrong.

### Desktop
- [ ] **Add**: `+ Card` puts a card in the middle of the screen, ready to type.
- [ ] **Edit**: click the middle of an existing card → caret appears, typing works.
- [ ] **Leave**: click empty canvas → card stops editing.
- [ ] **Move**: drag a card by its edge. Does grabbing the edge feel OK, or too fiddly?
- [ ] **Resize**: drag a side handle → width changes, text re-wraps, height follows content.
- [ ] **Format**: H1/H2/H3, A−/A+, bold/italic/underline/strike, bullets, numbers.
- [ ] **Checklist**: make one, tick items (also in View mode).
- [ ] **Table**: insert, add/remove rows and columns, delete.
- [ ] **Link**: select text → 🔗 → paste URL → OK.
- [ ] **Colour**: change card colour from the swatches.
- [ ] **Shortcuts**: ⌘B / ⌘I / ⌘Z inside a card affect the card, not the canvas.
- [ ] **Zoom**: zoom far out and in. Do cards stay aligned with the canvas and readable?
- [ ] **Mix**: draw, add shapes, arrows, stickers (library), images around cards.
- [ ] **Copy/paste**: duplicate a card, edit the copy → original unchanged.
- [ ] **Undo**: delete a card (select by edge, Delete key) → ⌘Z brings it back with its text.
- [ ] **Dark mode**: Excalidraw menu → dark theme. Cards and toolbar readable?
- [ ] **Reload**: everything comes back.

### Phone (`pnpm dev:lan`)
- [ ] Opens in View mode; pan and pinch-zoom feel OK.
- [ ] Tap a checklist box in View mode.
- [ ] Switch to Edit, tap a card, type with the on-screen keyboard.
- [ ] Toolbar usable at phone width (scrolls sideways).

## Known limits (expected in Phase 0)
- Browser-only storage; images can fill it up (badge shows "Not saved").
- First click on a card activates it; a second click places the caret where you want it.
- Card text isn't searchable yet (Phase 3).
- Excalidraw's own "Web embed" tool still works for real websites; that's fine.

## Findings

_Fill in after testing._

| Area | Works? | Notes |
|---|---|---|
| Editing in cards | | |
| Moving / resizing | | |
| Zoom alignment | | |
| Phone | | |

**Decision:** embeddable approach ☐ keep ☐ switch to overlay
