export type FloatingTone = 'positive' | 'negative' | 'neutral' | 'warning';

interface FloatingBase {
  id: string;
  tone: FloatingTone;
  /** Transloco key under the `frenzy.scene` prefix, e.g. `floatingText.food.2` or `statusMessage.died.0`. */
  textKey: string;
  /** Visible lifetime until full fade-out, ms. Drives both the CSS animation and the removal timer. */
  durationMs: number;
  /** Optional Taiga icon name (`@tui.*`) shown before the text. */
  icon?: string;
  who?: string;
  delta?: number;
  /** Release order within an owner's column: higher floats up first, ties break FIFO. */
  priority: number;
}

/**
 * A float that belongs to a live player sprite. The scene renders it inside that player's container,
 * so it sits above the head and follows the sprite's drift without carrying any coordinates.
 */
export interface OwnedFloat extends FloatingBase {
  ownerId: string;
}

/**
 * A float for a player that has already vanished (death). There is no sprite to nest under, so it is
 * stamped at the player's last-known normalized scene position and rendered in the scene overlay.
 */
export interface OrphanFloat extends FloatingBase {
  x: number;
  y: number;
}
