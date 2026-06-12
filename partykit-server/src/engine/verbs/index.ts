/**
 * The closed verb-primitive set the engine resolves item descriptors through — one file per verb, dispatched by
 * `resolveInteraction`. Everything is generic over the game's id unions (`TItemId`/`TEffectId`/`TNpcId`):
 * resolvers read only their spec + `InteractionContext` (which carries the game's effect roster for ward
 * checks), never a concrete game's config. A new mechanic outside this vocabulary means a deliberate, reviewed
 * extension here (new verb file + a `CoreInteractionSpec` variant), not an ad-hoc hook.
 */
export { resolveInteraction } from './resolve-interaction';
export type { InteractionTrigger, ItemInteractions } from './resolve-interaction';
export type {
  EffectGrant,
  HpDelta,
  InteractionContext,
  ItemInteraction,
  PlayerImpulse,
} from './types';
