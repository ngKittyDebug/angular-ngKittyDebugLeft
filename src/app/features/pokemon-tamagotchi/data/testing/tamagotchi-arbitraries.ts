import * as fc from 'fast-check';
import type { EvolutionChainItemApiData } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { Achievement } from '../../models/achievement.model';
import type { EvolutionRequirement } from '../../models/evolution.model';
import type { InteractionEvent, InteractionType } from '../../models/interaction.model';
import type { GameResult, MiniGameType } from '../../models/mini-game.model';
import type { Pokemon } from '../../models/pokemon.model';
import type { PokemonStatus, StatusDecay, StatusUpdate } from '../../models/pokemon-status.model';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import { createInitialTamagotchiState } from '../store/tamagotchi.state';

export const TEST_POKEMON: Pokemon = {
  baseStats: {
    energyRestorationRate: 1,
    experienceMultiplier: 1,
    hungerDecayRate: 1,
    moodDecayRate: 1,
  },
  evolutionChain: { currentStage: 1, totalStages: 3 },
  id: '25',
  isFirstStage: true,
  name: 'Pikachu',
  species: 'pikachu',
  spriteUrls: {
    eating: '/sprites/eating.png',
    evolving: '/sprites/evolving.png',
    happy: '/sprites/happy.png',
    normal: '/sprites/normal.png',
    sad: '/sprites/sad.png',
    sleeping: '/sprites/sleeping.png',
  },
  spriteVariations: {
    default: {
      eating: '/sprites/eating.png',
      evolving: '/sprites/evolving.png',
      happy: '/sprites/happy.png',
      normal: '/sprites/normal.png',
      sad: '/sprites/sad.png',
      sleeping: '/sprites/sleeping.png',
    },
    retro: {
      eating: '/sprites/retro-eating.png',
      evolving: '/sprites/retro-evolving.png',
      happy: '/sprites/retro-happy.png',
      normal: '/sprites/retro-normal.png',
      sad: '/sprites/retro-sad.png',
      sleeping: '/sprites/retro-sleeping.png',
    },
    shiny: {
      eating: '/sprites/shiny-eating.png',
      evolving: '/sprites/shiny-evolving.png',
      happy: '/sprites/shiny-happy.png',
      normal: '/sprites/shiny-normal.png',
      sad: '/sprites/shiny-sad.png',
      sleeping: '/sprites/shiny-sleeping.png',
    },
  },
};

const miniGameTypes: MiniGameType[] = ['memory', 'pattern', 'reflex', 'timing'];
const interactionTypes: InteractionType[] = ['click', 'drag', 'multiTouch', 'pet'];
const evolutionRequirementTypes = ['achievement', 'care', 'experience', 'level', 'time'] as const;

export const arbitraryEvolutionRequirement = (): fc.Arbitrary<EvolutionRequirement> =>
  fc.record({
    description: fc.string({ maxLength: 40, minLength: 1 }),
    type: fc.constantFrom(...evolutionRequirementTypes),
    value: fc.integer({ max: 2_000, min: 1 }),
  });

export const arbitraryEvolutionRequirements = (): fc.Arbitrary<EvolutionRequirement[]> =>
  fc.array(arbitraryEvolutionRequirement(), { maxLength: 5, minLength: 1 });

export function buildLinearEvolutionChain(stageCount: number): EvolutionChainItemApiData {
  const rootSpecies = 'species-0';
  let node: EvolutionChainItemApiData = {
    evolution_details: [],
    evolves_to: [],
    is_baby: false,
    species: { name: `species-${stageCount - 1}`, url: '' },
  };

  for (let stage = stageCount - 2; stage >= 0; stage -= 1) {
    node = {
      evolution_details: [],
      evolves_to: [node],
      is_baby: false,
      species: { name: `species-${stage}`, url: '' },
    };
  }

  if (stageCount === 1) {
    return {
      evolution_details: [],
      evolves_to: [],
      is_baby: false,
      species: { name: rootSpecies, url: '' },
    };
  }

  return node;
}

export const arbitraryLinearEvolutionChain = (): fc.Arbitrary<{
  chain: EvolutionChainItemApiData;
  speciesIndex: number;
  stageCount: number;
}> =>
  fc.integer({ max: 5, min: 1 }).chain((stageCount) =>
    fc.integer({ max: stageCount - 1, min: 0 }).map((speciesIndex) => ({
      chain: buildLinearEvolutionChain(stageCount),
      speciesIndex,
      stageCount,
    })),
  );

export const arbitraryTrainingAchievements = (): fc.Arbitrary<Achievement[]> =>
  fc.array(
    fc.record({
      category: fc.constant<'training'>('training'),
      description: fc.string({ maxLength: 30, minLength: 1 }),
      id: fc.uuid(),
      name: fc.string({ maxLength: 20, minLength: 1 }),
      requirements: fc.constant([]),
      reward: fc.record({
        experience: fc.integer({ max: 500, min: 0 }),
        unlockables: fc.constant([] as string[]),
      }),
      unlocked: fc.boolean(),
      unlockedAt: fc.option(fc.nat(), { nil: null }),
    }),
    { maxLength: 6, minLength: 0 },
  );

export const arbitraryPokemonStatus = (): fc.Arbitrary<PokemonStatus> =>
  fc.record({
    energy: fc.integer({ max: 100, min: 0 }),
    experience: fc.nat({ max: 10_000 }),
    health: fc.integer({ max: 100, min: 0 }),
    hunger: fc.integer({ max: 100, min: 0 }),
    hydration: fc.integer({ max: 100, min: 0 }),
    lastFeedTime: fc.option(fc.nat(), { nil: null }),
    lastHydrationTime: fc.option(fc.nat(), { nil: null }),
    lastPlayTime: fc.option(fc.nat(), { nil: null }),
    lastSaveTime: fc.option(fc.nat(), { nil: null }),
    lastSleepTime: fc.option(fc.nat(), { nil: null }),
    level: fc.integer({ max: 100, min: 1 }),
    mood: fc.integer({ max: 100, min: 0 }),
  });

export const arbitraryStatusUpdate = (): fc.Arbitrary<StatusUpdate> =>
  fc.record({
    energy: fc.option(fc.integer({ max: 50, min: -50 }), { nil: undefined }),
    experience: fc.option(fc.integer({ max: 200, min: -200 }), { nil: undefined }),
    health: fc.option(fc.integer({ max: 50, min: -50 }), { nil: undefined }),
    hunger: fc.option(fc.integer({ max: 50, min: -50 }), { nil: undefined }),
    hydration: fc.option(fc.integer({ max: 50, min: -50 }), { nil: undefined }),
    level: fc.option(fc.integer({ max: 5, min: -5 }), { nil: undefined }),
    mood: fc.option(fc.integer({ max: 50, min: -50 }), { nil: undefined }),
  });

export const arbitraryStatusDecay = (): fc.Arbitrary<StatusDecay> =>
  fc.record({
    energy: fc.integer({ max: 50, min: 0 }),
    hunger: fc.integer({ max: 50, min: 0 }),
    hydration: fc.integer({ max: 50, min: 0 }),
    mood: fc.integer({ max: 50, min: 0 }),
    timestamp: fc.nat(),
  });

export const arbitraryGameResult = (): fc.Arbitrary<GameResult> =>
  fc.record({
    experienceEarned: fc.nat({ max: 500 }),
    gameType: fc.constantFrom(...miniGameTypes),
    maxScore: fc.integer({ max: 1000, min: 1 }),
    performance: fc.float({ max: 1, min: 0 }),
    score: fc.nat({ max: 1000 }),
    timeTaken: fc.nat({ max: 120_000 }),
  });

export const arbitraryInteractionEvent = (): fc.Arbitrary<InteractionEvent> =>
  fc.record({
    intensity: fc.float({ max: 1, min: 0 }),
    moodIncrease: fc.integer({ max: 30, min: 0 }),
    timestamp: fc.nat(),
    type: fc.constantFrom(...interactionTypes),
  });

export type CareActionKind =
  | 'applyStatusDecay'
  | 'care'
  | 'feed'
  | 'interact'
  | 'play'
  | 'train'
  | 'updateStatus'
  | 'water';

export interface CareAction {
  decay?: StatusDecay;
  gameResult?: GameResult;
  interaction?: InteractionEvent;
  kind: CareActionKind;
  statusUpdate?: StatusUpdate;
}

export const arbitraryCareAction = (): fc.Arbitrary<CareAction> =>
  fc.oneof(
    fc.record({ kind: fc.constant<CareActionKind>('feed') }),
    fc.record({ kind: fc.constant<CareActionKind>('water') }),
    fc.record({ kind: fc.constant<CareActionKind>('care') }),
    fc.record({ kind: fc.constant<CareActionKind>('play') }),
    fc.record({
      gameResult: arbitraryGameResult(),
      kind: fc.constant<CareActionKind>('train'),
    }),
    fc.record({
      interaction: arbitraryInteractionEvent(),
      kind: fc.constant<CareActionKind>('interact'),
    }),
    fc.record({
      kind: fc.constant<CareActionKind>('updateStatus'),
      statusUpdate: arbitraryStatusUpdate(),
    }),
    fc.record({
      decay: arbitraryStatusDecay(),
      kind: fc.constant<CareActionKind>('applyStatusDecay'),
    }),
  );

export const arbitraryTamagotchiState = (): fc.Arbitrary<TamagotchiState> =>
  fc
    .record({
      error: fc.option(fc.string(), { nil: null }),
      initialized: fc.boolean(),
      isSleeping: fc.boolean(),
      lastActionTime: fc.option(fc.nat(), { nil: null }),
      lastDecayTime: fc.option(fc.nat(), { nil: null }),
      lastSaveTime: fc.option(fc.nat(), { nil: null }),
      pokemon: fc.constant(TEST_POKEMON),
      status: arbitraryPokemonStatus(),
    })
    .map((fields) => {
      const base = createInitialTamagotchiState();

      return {
        ...base,
        ...fields,
        activeMiniGame: null,
        evolutionProgress: base.evolutionProgress,
        isEvolving: false,
        status: { ...fields.status },
      };
    });
