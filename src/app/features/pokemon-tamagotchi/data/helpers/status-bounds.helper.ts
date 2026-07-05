import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { PokemonStatusModel } from '../models/pokemon-status.model';

export function clampStatusValue(value: number): number {
  return Math.min(
    GAME_BALANCE.THRESHOLDS.MAXIMUM,
    Math.max(GAME_BALANCE.THRESHOLDS.MINIMUM, value),
  );
}

export function applyStatusDelta(current: number, delta: number): number {
  return clampStatusValue(current + delta);
}

export function normalizePokemonStatus(status: PokemonStatusModel): PokemonStatusModel {
  return {
    ...status,
    energy: clampStatusValue(status.energy),
    experience: Math.max(0, Math.round(status.experience)),
    health: clampStatusValue(status.health),
    hunger: clampStatusValue(status.hunger),
    hydration: clampStatusValue(status.hydration),
    level: Math.max(1, Math.round(status.level)),
    mood: clampStatusValue(status.mood),
  };
}
