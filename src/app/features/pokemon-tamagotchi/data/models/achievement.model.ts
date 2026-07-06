export interface AchievementRequirementModel {
  type: 'totalActions' | 'consecutiveDays' | 'statusMaintained';
  target: number;
  current: number;
}

export interface AchievementRewardModel {
  experience: number;
  unlockables: string[];
}

export interface AchievementModel {
  id: string;
  name: string;
  description: string;
  category: 'care' | 'training' | 'evolution' | 'interaction' | 'routine';
  requirements: AchievementRequirementModel[];
  unlocked: boolean;
  unlockedAt: number | null;
  reward: AchievementRewardModel;
}
