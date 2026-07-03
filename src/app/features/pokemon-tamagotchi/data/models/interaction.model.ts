export type InteractionType = 'click' | 'drag' | 'pet' | 'multiTouch';

export interface InteractionEventModel {
  type: InteractionType;
  timestamp: number;
  intensity: number;
  moodIncrease: number;
}

export interface GestureConfigModel {
  type: InteractionType;
  sensitivity: number;
  minDuration?: number;
  maxDuration?: number;
  moodReward: number;
  animationTrigger: string;
}
