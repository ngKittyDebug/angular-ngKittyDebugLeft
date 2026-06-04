import type { Stage } from '@game/frenzy/types';

import { getMood } from './pokemon-mood';

export function isSad(mass: number, stage: Stage): boolean {
  const mood = getMood(mass, stage);

  return mood === 'hungry' || mood === 'starving';
}
