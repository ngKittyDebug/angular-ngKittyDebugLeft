// Pure resolution of a scene pointer press into game intent — no Angular/DI. The component reads the DOM (refs,
// rects, the event target) and applies the effects (facade calls, outputs); the decision of WHAT a press means
// — the world-point normalization, which targets suppress which effects, and the bomb shove direction — lives
// here so it is one tested unit instead of math scattered across the component's handlers.

// A rect the press is measured against — structurally a `DOMRect` (so the caller can pass `getBoundingClientRect()`).
export interface PressBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SceneTapIntent {
  // Normalized world point of the press (0..1), clamped for presses in the letterbox margin.
  x: number;
  y: number;
  // Spawn the airy miss-bubble: a press anywhere EXCEPT on an item (an item hit gets the converging `eaten` burst).
  spawnBurst: boolean;
  // Steer my Pokémon toward the point: a press on open water/decor/another player, but NOT on an actionable target
  // (an item to eat, or a poke button).
  steer: boolean;
}

// A press on an item gets the converging success burst from `eaten`, so it suppresses the airy miss-bubble.
const ITEM_SELECTOR = '.scene__item';
// Items and poke buttons carry their own (click) actions, so a press on them must not also steer.
const ACTIONABLE_SELECTOR = '.scene__item, .scene__poke, .scene__poke-npc';

/**
 * Resolve a scene background press: normalize it to the world point (rect-relative, so it is scroll-independent and
 * clamped to 0..1) and decide whether it spawns the miss-bubble and whether it steers, from what it landed on.
 */
export function resolveSceneTap(
  bounds: PressBounds,
  clientX: number,
  clientY: number,
  target: Element | null,
): SceneTapIntent {
  return {
    x: clamp01((clientX - bounds.left) / bounds.width),
    y: clamp01((clientY - bounds.top) / bounds.height),
    spawnBurst: target === null || target.closest(ITEM_SELECTOR) === null,
    steer: target === null || target.closest(ACTIONABLE_SELECTOR) === null,
  };
}

/**
 * Bomb shove direction: a unit vector pointing FROM the tapped point toward the element's centre — i.e. away from
 * the side that was hit (tap the right edge → push left, the top → push down, a corner → diagonally). The server
 * scales it by a fixed impulse, so only the direction matters. A dead-centre tap falls back to a straight-up shove.
 */
export function resolveNudge(
  bounds: PressBounds,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const deltaX = bounds.left + bounds.width / 2 - clientX;
  const deltaY = bounds.top + bounds.height / 2 - clientY;
  const magnitude = Math.hypot(deltaX, deltaY);

  if (magnitude === 0) {
    return { x: 0, y: -1 };
  }

  return { x: deltaX / magnitude, y: deltaY / magnitude };
}

// A canvas-drawn item the hit-test can pick: its id and normalized world centre (0..1). Items are sized uniformly,
// so the caller passes one normalized half-extent per axis.
export interface CanvasHitItem {
  id: string;
  x: number;
  y: number;
}

/**
 * Topmost canvas item under a press, or null for open water. In canvas render mode items are no longer DOM nodes, so
 * `event.target` can't name them — but the canvas rides the same camera-transformed world as the players, so the
 * press already normalizes to the world point (`resolveSceneTap`). This tests that normalized point against each
 * item's normalized centre ± a half tap box (the item half-size plus a finger-friendly padding, expressed per axis
 * because the world is taller than it is wide). `items` are passed in draw order (ascending depth); the LAST drawn
 * sits on top, so the scan runs back-to-front and returns the first box the point falls inside.
 */
export function hitTestItem(
  items: readonly CanvasHitItem[],
  normX: number,
  normY: number,
  halfExtentX: number,
  halfExtentY: number,
): string | null {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];

    if (Math.abs(normX - item.x) <= halfExtentX && Math.abs(normY - item.y) <= halfExtentY) {
      return item.id;
    }
  }

  return null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
