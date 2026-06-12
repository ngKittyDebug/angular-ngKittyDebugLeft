import { FRENZY } from '@game/frenzy/config';
import type { Stage } from '@game/frenzy/types';

export type PokemonMood = 'starving' | 'hungry' | 'content' | 'happy';

// Mood is derived purely from the server-authoritative hp + stage (no backend field).
// Hp below which the Pokémon is hungry (sad), per stage. Stages 1–2 keep the historical
// sad thresholds; stage 3 (hp >= 500) gets its own band so a barely-evolved stage-3
// Pokémon can still look hungry instead of never being sad.
const HUNGRY_BELOW: Record<Stage, number> = { 1: 100, 2: 250, 3: 600 };

// Hp at or above which the Pokémon is comfortably fed (happy), per stage.
const HAPPY_AT: Record<Stage, number> = { 1: 160, 2: 420, 3: 800 };

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
