export type MiniGameType = 'reflex' | 'memory' | 'timing' | 'pattern';

export interface MiniGameConfig {
  type: MiniGameType;
  duration: number;
  difficulty: number;
  experienceReward: {
    base: number;
    multiplier: number;
  };
}

export interface GameResult {
  gameType: MiniGameType;
  score: number;
  maxScore: number;
  timeTaken: number;
  performance: number;
  experienceEarned: number;
}
