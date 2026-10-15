# Slate

An Excalidraw-style infinite whiteboard for dumping notes, checklists, small tables, sketches, stickers and images, then dragging them around to organize ideas. Signed in with Google and stored in your own Google Drive (from Phase 1).

The design and decisions live in [`docs/PLAN.md`](docs/PLAN.md).

## Status

**Phase 0: prototype.** A throwaway board that tests whether rich-text note cards work well inside Excalidraw. It saves to the browser only (no Google sign-in yet). See [`docs/PHASE0.md`](docs/PHASE0.md) for what to test.

## Getting started

Requires Node 20+ and pnpm.

```bash
corepack enable          # once, makes the pinned pnpm version available
pnpm install
pnpm dev                 # http://localhost:5173
```

To try it on your phone (same Wi-Fi):

```bash
pnpm dev:lan             # prints a Network URL, open it on the phone
```

## Layout

```
docs/                 plan and phase notes
prototypes/
  phase0-board/       Phase 0 throwaway prototype
apps/                 (Phase 1) slate app
packages/             (Phase 1) core, storage, auth, richtext, images
```
