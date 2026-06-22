import type { PlayerEffectKind } from '@game/frenzy/types';

import type { FloatingTone } from './floating-message';

// Icon + tone for one timed effect. `icon` is a Taiga glyph (`@tui.*`); `tone` reuses the floating-text palette
// (positive → green, warning → amber) so the buff colour reads the same everywhere it appears.
export interface EffectBadge {
  icon: string;
  tone: FloatingTone;
}

// The single client-side source of "effect → { icon, tone }". The scene badges over sprites, the status-card buff
// strip and the floating-status quips (STATUS_CONFIG derives its icon/tone here) all read from this one map, so they
// can never drift apart. Exhaustive over `PlayerEffectKind`: enabling a new effect (flipping its `enabled`) breaks
// this `Record` until it gets a row.
export const EFFECT_BADGE: Record<PlayerEffectKind, EffectBadge> = {
  shield: { icon: '@tui.shield', tone: 'positive' },
  wellFed: { icon: '@tui.heart', tone: 'positive' },
  laying: { icon: '@tui.egg', tone: 'positive' },
  pooping: { icon: '@tui.wind', tone: 'warning' },
  cactus: { icon: '@tui.swords', tone: 'positive' },
};
