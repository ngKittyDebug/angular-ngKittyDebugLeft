import { FRENZY } from '@game/frenzy/config';
import type { Stage } from '@game/frenzy/types';

export type PokemonMood = 'starving' | 'hungry' | 'content' | 'happy';

// Mood is derived purely from the server-authoritative hp + stage (no backend field).
// Hp below which the Pokémon is hungry (sad), per stage. Each band sits inside its stage's hp zone
// (stage gates 0/500/1000 on the 0→1500 ceiling) so a freshly-evolved Pokémon can still look hungry
// near the bottom of its zone instead of being locked happy the instant it evolves.
const HUNGRY_BELOW: Record<Stage, number> = { 1: 150, 2: 650, 3: 1100 };

// Hp at or above which the Pokémon is comfortably fed (happy), per stage.
const HAPPY_AT: Record<Stage, number> = { 1: 350, 2: 850, 3: 1300 };

export function getMood(hp: number, stage: Stage): PokemonMood {
  if (hp <= FRENZY.lowHpWarningThreshold) {
    return 'starving';
  }

  if (hp < HUNGRY_BELOW[stage]) {
    return 'hungry';
  }

  if (hp >= HAPPY_AT[stage]) {
    return 'happy';
  }

  return 'content';
}
