import { Service } from '@angular/core';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { getActionCooldownMs, getActionEnergyCost } from '../helpers/status-calculator.helper';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import type {
  ActionCooldownsModel,
  ActionType,
  ValidationResultModel,
} from '../models/tamagotchi-state.model';

export interface TamagotchiActionContext {
  hasPokemon: boolean;
  isSleeping: boolean;
  isTraining: boolean;
  lastActionTime: number | null;
  status: PokemonStatusModel;
  now?: number;
}

const AWAKE_ONLY_ACTIONS = new Set<ActionType>(['feed', 'play', 'train']);
const GAME_ACTIONS = new Set<ActionType>(['play', 'train']);

@Service({ autoProvided: false })
export class TamagotchiService {
  public validateAction(
    context: TamagotchiActionContext,
    action: ActionType,
  ): ValidationResultModel {
    if (!context.hasPokemon) {
      return { allowed: false, reason: 'noPokemon' };
    }

    if (context.isTraining && action !== 'play') {
      return { allowed: false, reason: 'training' };
    }

    if (context.isSleeping && AWAKE_ONLY_ACTIONS.has(action)) {
      return { allowed: false, reason: 'sleeping' };
    }

    if (action === 'sleep' && context.isSleeping) {
      return { allowed: false, reason: 'alreadySleeping' };
    }

    const energyCost = getActionEnergyCost(action);

    if (energyCost > 0 && context.status.energy < energyCost) {
      return { allowed: false, reason: 'insufficientEnergy' };
    }

    if (GAME_ACTIONS.has(action) && context.status.energy <= STATUS_THRESHOLDS.energyWarning) {
      return { allowed: false, reason: 'lowEnergy' };
    }

    const cooldownRemaining = this.getCooldownRemaining(context, action);

    if (cooldownRemaining > 0) {
      return {
        allowed: false,
        cooldownRemaining,
        reason: 'cooldown',
      };
    }

    return { allowed: true };
  }

  public getActionCooldowns(context: TamagotchiActionContext): ActionCooldownsModel {
    return {
      care: this.getCooldownRemaining(context, 'care') || null,
      feed: this.getCooldownRemaining(context, 'feed') || null,
      play: this.getCooldownRemaining(context, 'play') || null,
      sleep: this.getCooldownRemaining(context, 'sleep') || null,
      train: this.getCooldownRemaining(context, 'train') || null,
      water: this.getCooldownRemaining(context, 'water') || null,
    };
  }

  private getCooldownRemaining(context: TamagotchiActionContext, action: ActionType): number {
    const lastTimestamp = this.getLastActionTimestamp(context, action);

    if (lastTimestamp === null) {
      return 0;
    }

    const now = context.now ?? Date.now();
    const elapsed = now - lastTimestamp;

    return Math.max(0, getActionCooldownMs(action) - elapsed);
  }

  private getLastActionTimestamp(
    context: TamagotchiActionContext,
    action: ActionType,
  ): number | null {
    const { status } = context;

    switch (action) {
      case 'feed':
        return status.lastFeedTime;

      case 'water':
        return status.lastHydrationTime;

      case 'play':
        return status.lastPlayTime;

      case 'sleep':
        return status.lastSleepTime;

      case 'care':
        return status.lastCareTime;

      case 'train':
        return status.lastTrainTime;
    }
  }
}
