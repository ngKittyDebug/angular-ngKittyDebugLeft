export type InteractionType = 'click' | 'drag' | 'pet' | 'multiTouch';

export interface InteractionEvent {
  type: InteractionType;
  timestamp: number;
  intensity: number;
  moodIncrease: number;
}

export interface GestureConfig {
  type: InteractionType;
  sensitivity: number;
  minDuration?: number;
  maxDuration?: number;
  moodReward: number;
  animationTrigger: string;
}
