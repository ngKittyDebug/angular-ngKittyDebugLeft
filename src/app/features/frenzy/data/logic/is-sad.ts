import type { Stage } from '@game/frenzy/types';

import { getMood } from './pokemon-mood';

export function isSad(hp: number, stage: Stage): boolean {
  const mood = getMood(hp, stage);

  return mood === 'hungry' || mood === 'starving';
}
