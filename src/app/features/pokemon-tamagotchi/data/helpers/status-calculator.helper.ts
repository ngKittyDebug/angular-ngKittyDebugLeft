import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { ActionType } from '../models/tamagotchi-state.model';
import type { PokemonStatusModel, StatusUpdateModel } from '../models/pokemon-status.model';
import { applyStatusDelta } from './status-bounds.helper';

export function calculateStatusUpdate(
  currentStatus: PokemonStatusModel,
  action: ActionType,
): StatusUpdateModel {
  switch (action) {
    case 'feed': {
      const { energyCost, hungerIncrease, moodIncrease } = GAME_BALANCE.ACTION_EFFECTS.FEED;

      return {
        energy: -energyCost,
        hunger: hungerIncrease,
        mood: moodIncrease,
      };
    }

    case 'water': {
      const { energyCost, hydrationIncrease } = GAME_BALANCE.ACTION_EFFECTS.WATER;

      return {
        energy: -energyCost,
        hydration: hydrationIncrease,
      };
    }

    case 'care': {
      const { energyCost, healthIncrease, moodIncrease } = GAME_BALANCE.ACTION_EFFECTS.CARE;

      return {
        energy: -energyCost,
        health: healthIncrease,
        mood: moodIncrease,
      };
    }

    case 'play': {
      const { energyCost, moodIncrease } = GAME_BALANCE.ACTION_EFFECTS.PLAY;

      return {
        energy: -energyCost,
        mood: moodIncrease,
      };
    }

    case 'train': {
      const { energyCost } = GAME_BALANCE.ACTION_EFFECTS.TRAIN;

      return { energy: -energyCost };
    }

    case 'sleep':
      return {};
  }
}

export function applyStatusUpdate(
  currentStatus: PokemonStatusModel,
  statusUpdate: StatusUpdateModel,
): PokemonStatusModel {
  const next = { ...currentStatus };

  if (statusUpdate.health !== undefined) {
    next.health = applyStatusDelta(next.health, statusUpdate.health);
  }

  if (statusUpdate.hunger !== undefined) {
    next.hunger = applyStatusDelta(next.hunger, statusUpdate.hunger);
  }

  if (statusUpdate.mood !== undefined) {
    next.mood = applyStatusDelta(next.mood, statusUpdate.mood);
  }

  if (statusUpdate.energy !== undefined) {
    next.energy = applyStatusDelta(next.energy, statusUpdate.energy);
  }

  if (statusUpdate.hydration !== undefined) {
    next.hydration = applyStatusDelta(next.hydration, statusUpdate.hydration);
  }

  if (statusUpdate.experience !== undefined) {
    next.experience = Math.max(0, next.experience + statusUpdate.experience);
  }

  if (statusUpdate.level !== undefined) {
    next.level = Math.max(1, next.level + statusUpdate.level);
  }

  return next;
}

export function getActionEnergyCost(action: ActionType): number {
  switch (action) {
    case 'feed':
      return GAME_BALANCE.ACTION_EFFECTS.FEED.energyCost;

    case 'water':
      return GAME_BALANCE.ACTION_EFFECTS.WATER.energyCost;

    case 'care':
      return GAME_BALANCE.ACTION_EFFECTS.CARE.energyCost;

    case 'play':
      return GAME_BALANCE.ACTION_EFFECTS.PLAY.energyCost;

    case 'train':
      return GAME_BALANCE.ACTION_EFFECTS.TRAIN.energyCost;

    case 'sleep':
      return 0;
  }
}

export function getActionCooldownMs(action: ActionType): number {
  switch (action) {
    case 'feed':
      return GAME_BALANCE.ACTION_EFFECTS.FEED.cooldown;

    case 'water':
      return GAME_BALANCE.ACTION_EFFECTS.WATER.cooldown;

    case 'care':
      return GAME_BALANCE.ACTION_EFFECTS.CARE.cooldown;

    case 'play':
      return GAME_BALANCE.ACTION_EFFECTS.PLAY.cooldown;

    case 'train':
      return GAME_BALANCE.ACTION_EFFECTS.TRAIN.cooldown;

    case 'sleep':
      return GAME_BALANCE.ACTION_EFFECTS.SLEEP.cooldown;
  }
}
