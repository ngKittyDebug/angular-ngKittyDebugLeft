import type { GestureConfigModel, InteractionType } from '../models/interaction.model';

export const GESTURE_CONFIGS: Record<InteractionType, GestureConfigModel> = {
  click: {
    animationTrigger: 'sprite-pop',
    moodReward: 3,
    sensitivity: 1,
    type: 'click',
  },
  drag: {
    animationTrigger: 'sprite-wiggle',
    maxDuration: 3000,
    moodReward: 2,
    sensitivity: 0.8,
    type: 'drag',
  },
  multiTouch: {
    animationTrigger: 'sprite-sparkle',
    moodReward: 5,
    sensitivity: 1.5,
    type: 'multiTouch',
  },
  pet: {
    animationTrigger: 'sprite-pet',
    maxDuration: 2000,
    minDuration: 200,
    moodReward: 4,
    sensitivity: 1.2,
    type: 'pet',
  },
};

export const GESTURE_THRESHOLDS = {
  CLICK_MAX_DISTANCE_PX: 10,
  CLICK_MAX_DURATION_MS: 300,
  DRAG_MIN_DISTANCE_PX: 24,
  DRAG_INTENSITY_DISTANCE_PX: 120,
  PET_MIN_DISTANCE_PX: 8,
  PET_MIN_DURATION_MS: 200,
} as const;

export const BOND_LEVEL = {
  MAX: 100,
  WINDOW_MS: 24 * 60 * 60 * 1000,
  TYPE_WEIGHT: {
    click: 1,
    drag: 1.2,
    multiTouch: 2,
    pet: 1.5,
  } satisfies Record<InteractionType, number>,
} as const;
