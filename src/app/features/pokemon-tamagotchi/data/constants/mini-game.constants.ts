import type { MiniGameConfig, MiniGameType } from '../../models/mini-game.model';

export const MINI_GAME_CONFIGS: Record<MiniGameType, MiniGameConfig> = {
  reflex: {
    type: 'reflex',
    duration: 60,
    difficulty: 2,
    experienceReward: {
      base: 10,
      multiplier: 2.0,
    },
  },
  memory: {
    type: 'memory',
    duration: 90,
    difficulty: 3,
    experienceReward: {
      base: 15,
      multiplier: 2.5,
    },
  },
  timing: {
    type: 'timing',
    duration: 45,
    difficulty: 2,
    experienceReward: {
      base: 8,
      multiplier: 1.8,
    },
  },
  pattern: {
    type: 'pattern',
    duration: 75,
    difficulty: 4,
    experienceReward: {
      base: 20,
      multiplier: 3.0,
    },
  },
};
