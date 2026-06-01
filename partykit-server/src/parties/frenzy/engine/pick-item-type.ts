import { GAME } from '@game/frenzy/constants';
import type { ItemType } from '@game/frenzy/types';

export function pickItemType(rng: () => number): ItemType {
  const { bomb, food, rareCandy, rock, rotten } = GAME.spawnWeights;
  const total = food + rotten + rock + rareCandy + bomb;
  const roll = rng() * total;

  if (roll < food) {
    return 'food';
  }

  if (roll < food + rotten) {
    return 'rotten';
  }

  if (roll < food + rotten + rock) {
    return 'rock';
  }

  if (roll < food + rotten + rock + rareCandy) {
    return 'rareCandy';
  }

  return 'bomb';
}
