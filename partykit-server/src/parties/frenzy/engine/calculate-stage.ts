import { GAME } from '@game/frenzy/constants';
import type { Stage } from '@game/frenzy/types';

export function calculateStage(mass: number): Stage {
  if (mass >= GAME.thresholds.stage3) {
    return 3;
  }

  if (mass >= GAME.thresholds.stage2) {
    return 2;
  }

  return 1;
}
