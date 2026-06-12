import { FRENZY } from '@game/frenzy/config';
import type { Stage } from '@game/frenzy/types';

export function calculateStage(mass: number): Stage {
  if (mass >= FRENZY.thresholds.stage3) {
    return 3;
  }

  if (mass >= FRENZY.thresholds.stage2) {
    return 2;
  }

  return 1;
}
