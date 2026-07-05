import { BOND_LEVEL, GESTURE_CONFIGS, GESTURE_THRESHOLDS } from '../constants/gesture.constants';
import type {
  GestureConfigModel,
  InteractionEventModel,
  InteractionType,
} from '../models/interaction.model';

export interface GestureResult {
  animationTrigger: string;
  event: InteractionEventModel;
}

export function getGestureConfig(type: InteractionType): GestureConfigModel {
  return GESTURE_CONFIGS[type];
}

export function calculateMoodIncrease(type: InteractionType, intensity: number): number {
  const config = getGestureConfig(type);
  const scaled = intensity * config.sensitivity * config.moodReward;

  return Math.max(1, Math.round(scaled));
}

export function createInteractionEvent(
  type: InteractionType,
  intensity: number,
  timestamp: number = Date.now(),
): InteractionEventModel {
  const clampedIntensity = Math.min(1, Math.max(0, intensity));

  return {
    intensity: clampedIntensity,
    moodIncrease: calculateMoodIncrease(type, clampedIntensity),
    timestamp,
    type,
  };
}

export function buildGestureResult(type: InteractionType, intensity: number): GestureResult {
  const config = getGestureConfig(type);

  return {
    animationTrigger: config.animationTrigger,
    event: createInteractionEvent(type, intensity),
  };
}

export function calculateBondLevel(
  history: InteractionEventModel[],
  now: number = Date.now(),
): number {
  const recent = history.filter((event) => now - event.timestamp <= BOND_LEVEL.WINDOW_MS);
  const score = recent.reduce((total, event) => {
    const weight = BOND_LEVEL.TYPE_WEIGHT[event.type];

    return total + event.intensity * weight * 10;
  }, 0);

  return Math.min(BOND_LEVEL.MAX, Math.round(score));
}

export function classifyPointerGesture(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  totalDistance: number,
  durationMs: number,
): InteractionType | null {
  const distance = Math.hypot(endX - startX, endY - startY);

  if (distance >= GESTURE_THRESHOLDS.DRAG_MIN_DISTANCE_PX) {
    return 'drag';
  }

  if (
    totalDistance >= GESTURE_THRESHOLDS.PET_MIN_DISTANCE_PX &&
    durationMs >= GESTURE_THRESHOLDS.PET_MIN_DURATION_MS &&
    durationMs <= (GESTURE_CONFIGS.pet.maxDuration ?? Number.POSITIVE_INFINITY)
  ) {
    return 'pet';
  }

  if (
    distance < GESTURE_THRESHOLDS.CLICK_MAX_DISTANCE_PX &&
    durationMs < GESTURE_THRESHOLDS.CLICK_MAX_DURATION_MS
  ) {
    return 'click';
  }

  return null;
}

export function intensityForGesture(
  type: InteractionType,
  distance: number,
  durationMs: number,
): number {
  switch (type) {
    case 'click':
      return 0.5;

    case 'drag':
      return Math.min(1, distance / GESTURE_THRESHOLDS.DRAG_INTENSITY_DISTANCE_PX);

    case 'pet':
      return Math.min(1, durationMs / (GESTURE_CONFIGS.pet.maxDuration ?? 2000));

    case 'multiTouch':
      return 1;
  }
}
