export interface AchievementRequirement {
  type: 'totalActions' | 'consecutiveDays' | 'statusMaintained' | 'miniGameScore';
  target: number;
  current: number;
}

export interface AchievementReward {
  experience: number;
  unlockables: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'care' | 'training' | 'evolution' | 'interaction' | 'routine';
  requirements: AchievementRequirement[];
  unlocked: boolean;
  unlockedAt: number | null;
  reward: AchievementReward;
}
