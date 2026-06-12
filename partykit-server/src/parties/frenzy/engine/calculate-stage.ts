import { FRENZY } from '@game/frenzy/config';
import type { Stage } from '@game/frenzy/types';

export function calculateStage(hp: number): Stage {
  if (hp >= FRENZY.thresholds.stage3) {
    return 3;
  }

  if (hp >= FRENZY.thresholds.stage2) {
    return 2;
  }

  return 1;
}
