import { GAME_BALANCE } from '../constants/game-balance.constants';

export function rollTrainingExperienceGain(random = Math.random()): number {
  const { min, max } = GAME_BALANCE.ACTION_EFFECTS.TRAIN.experienceReward;
  const span = max - min + 1;
  const offset = Math.min(span - 1, Math.floor(Math.max(0, random) * span));

  return min + offset;
}
