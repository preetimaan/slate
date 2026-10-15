import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from '@excalidraw/excalidraw/types'

/** One element of the scene, derived from the public API so we don't depend on internal type paths. */
export type SceneElement = ReturnType<ExcalidrawImperativeAPI['getSceneElementsIncludingDeleted']>[number]
export type EmbeddableElement = Parameters<NonNullable<ExcalidrawProps['renderEmbeddable']>>[0]

/** All note cards share this link; the card is identified by customData.cardId. */
export const CARD_LINK = 'slate://card'

export const DEFAULT_CARD_WIDTH = 280
export const DEFAULT_CARD_HEIGHT = 96

export function isCardElement(el: { type: string; customData?: Record<string, unknown> } | null | undefined): boolean {
  return !!el && el.type === 'embeddable' && typeof el.customData?.cardId === 'string'
}

export function cardIdOf(el: { customData?: Record<string, unknown> }): string {
  return el.customData?.cardId as string
}

/**
 * Builds an embeddable element for a card. We let Excalidraw build a normal
 * rectangle (so every required field is filled in) and then turn it into an
 * embeddable — the two share the same fields.
 */
export function createCardElement(
  cardId: string,
  x: number,
  y: number,
  width = DEFAULT_CARD_WIDTH,
  height = DEFAULT_CARD_HEIGHT,
): SceneElement {
  const [base] = convertToExcalidrawElements([
    {
      type: 'rectangle',
      x,
      y,
      width,
      height,
      strokeColor: 'transparent',
      backgroundColor: 'transparent',
      strokeWidth: 1,
      roughness: 0,
    },
  ])
  return {
    ...base,
    type: 'embeddable',
    link: CARD_LINK,
    roundness: { type: 3 },
    customData: { cardId },
  } as unknown as SceneElement
}

/** Returns a changed copy with bumped version info so Excalidraw notices the change. */
export function withChanges(el: SceneElement, changes: Record<string, unknown>): SceneElement {
  return {
    ...el,
    ...changes,
    version: el.version + 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    updated: Date.now(),
  } as SceneElement
}
