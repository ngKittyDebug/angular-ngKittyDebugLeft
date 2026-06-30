export const GAME_BALANCE = {
  STATUS_DECAY: {
    HUNGER: 10,
    MOOD: 8,
    ENERGY: 5,
    HYDRATION: 12,
  },
  ACTION_EFFECTS: {
    FEED: {
      hungerIncrease: 30,
      moodIncrease: 5,
      energyCost: 2,
      cooldown: 30 * 60 * 1000,
    },
    WATER: {
      hydrationIncrease: 25,
      energyCost: 1,
      cooldown: 20 * 60 * 1000,
    },
    CARE: {
      moodIncrease: 20,
      healthIncrease: 5,
      energyCost: 3,
      cooldown: 25 * 60 * 1000,
    },
    PLAY: {
      moodIncrease: 25,
      energyCost: 10,
      cooldown: 15 * 60 * 1000,
    },
    TRAIN: {
      experienceGain: 10,
      energyCost: 15,
      cooldown: 60 * 60 * 1000,
    },
    SLEEP: {
      energyRestore: 40,
      cooldown: 4 * 60 * 60 * 1000,
    },
  },
  EVOLUTION: {
    MIN_LEVEL: 10,
    MIN_EXPERIENCE: 1000,
    MIN_CARE_SCORE: 80,
    MIN_TRAINING_SCORE: 60,
  },
  THRESHOLDS: {
    WARNING: 30,
    CRITICAL: 15,
    MINIMUM: 0,
    MAXIMUM: 100,
  },
} as const;
