import { GAME } from '@game/frenzy/constants';
import type { Stage } from '@game/frenzy/types';

export type PokemonMood = 'starving' | 'hungry' | 'content' | 'happy';

// Mood is derived purely from the server-authoritative mass + stage (no backend field).
// Mass below which the Pokémon is hungry (sad), per stage. Stages 1–2 keep the historical
// sad thresholds; stage 3 (mass >= 500) gets its own band so a barely-evolved stage-3
// Pokémon can still look hungry instead of never being sad.
const HUNGRY_BELOW: Record<Stage, number> = { 1: 100, 2: 250, 3: 600 };

// Mass at or above which the Pokémon is comfortably fed (happy), per stage.
const HAPPY_AT: Record<Stage, number> = { 1: 160, 2: 420, 3: 800 };

export function getMood(mass: number, stage: Stage): PokemonMood {
  if (mass <= GAME.lowMassWarningThreshold) {
    return 'starving';
  }

  if (mass < HUNGRY_BELOW[stage]) {
    return 'hungry';
  }

  if (mass >= HAPPY_AT[stage]) {
    return 'happy';
  }

  return 'content';
}
