export type FloatingTone = 'positive' | 'negative' | 'neutral' | 'warning';

export interface FloatingMessage {
  id: string;
  x: number;
  y: number;
  tone: FloatingTone;
  /** Transloco key under the `frenzy.scene` prefix, e.g. `floatingText.food.2` or `statusMessage.died.0`. */
  textKey: string;
  /** Visible lifetime until full fade-out, ms. Drives both the CSS animation and the removal timer. */
  durationMs: number;
  /** Optional Taiga icon name (`@tui.*`) shown before the text. */
  icon?: string;
  who?: string;
  delta?: number;
  /**
   * Anchor vertically to the floor (like the floor-standing Pokémon: `bottom: 5%` + sprite height)
   * instead of using `y` as a top fraction. Keeps status floats above the head on any viewport
   * height. Eat floats leave this off — their `y` is the real top-fraction where the item was eaten.
   */
  floor?: boolean;
  /**
   * Lift the float by N px above its `y` anchor — used by status floats so they sit at the top edge
   * of the drifting sprite (whose `y` is its centre) instead of over the middle of it.
   */
  topOffsetPx?: number;
}
