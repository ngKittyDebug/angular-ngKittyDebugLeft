import type { ItemType, Stage } from '@game/frenzy/types';

export interface FaintedStats {
  eatenByType: Record<ItemType, number>;
  lifespanSeconds: number;
  maxMass: number;
  maxStage: Stage;
  totalEaten: number;
}
