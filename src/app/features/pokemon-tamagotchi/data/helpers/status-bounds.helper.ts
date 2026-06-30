import { GAME_BALANCE } from '../constants/game-balance.constants';

export function clampStatusValue(value: number): number {
  return Math.min(
    GAME_BALANCE.THRESHOLDS.MAXIMUM,
    Math.max(GAME_BALANCE.THRESHOLDS.MINIMUM, value),
  );
}

export function applyStatusDelta(current: number, delta: number): number {
  return clampStatusValue(current + delta);
}
