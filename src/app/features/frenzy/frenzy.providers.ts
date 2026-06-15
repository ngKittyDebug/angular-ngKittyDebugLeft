import type { Provider } from '@angular/core';

import { BumpEffect } from './data/services/effects/bump-effect.service';
import { DetonationEffect } from './data/services/effects/detonation-effect.service';
import { EatEffect } from './data/services/effects/eat-effect.service';
import { EmissionSoundEffect } from './data/services/effects/emission-sound-effect.service';
import { EvolutionEffect } from './data/services/effects/evolution-effect.service';
import { FloatingMessagesStore } from './data/services/effects/floating-messages.store';
import { HitBurstEffect } from './data/services/effects/hit-burst-effect.service';
import { IntroQuipsEffect } from './data/services/effects/intro-quips-effect.service';
import { NpcQuipEffect } from './data/services/effects/npc-quip-effect.service';
import { PlayerEffectsTracker } from './data/services/effects/player-effects-tracker.service';
import { PresenceTracker } from './data/services/effects/presence-tracker.service';
import { ReactiveMoodEffect } from './data/services/effects/reactive-mood-effect.service';
import { SelfMoodEffect } from './data/services/effects/self-mood-effect.service';
import { ShieldBlockEffect } from './data/services/effects/shield-block-effect.service';
import { FrenzyEffectsService } from './data/services/frenzy-effects.service';
import { FrenzySocketService } from './data/services/frenzy-socket.service';
import { PlayerPersistenceService } from './data/services/player-persistence.service';
import { AudioEngineService } from './data/services/sound/audio-engine.service';
import { BadEatSoundService } from './data/services/sound/bad-eat-sound.service';
import { BrickSoundService } from './data/services/sound/brick-sound.service';
import { EasterEggSoundService } from './data/services/sound/easter-egg-sound.service';
import { EatSoundService } from './data/services/sound/eat-sound.service';
import { EggEmissionSoundService } from './data/services/sound/egg-emission-sound.service';
import { EvolveSoundService } from './data/services/sound/evolve-sound.service';
import { ExplosionSoundService } from './data/services/sound/explosion-sound.service';
import { PoopEatSoundService } from './data/services/sound/poop-eat-sound.service';
import { PoopEmissionSoundService } from './data/services/sound/poop-emission-sound.service';
import { RockSoundService } from './data/services/sound/rock-sound.service';
import { ShieldSoundService } from './data/services/sound/shield-sound.service';
import { SoundSettingsService } from './data/services/sound/sound-settings.service';
import { WellFedSoundService } from './data/services/sound/well-fed-sound.service';
import { FrenzyStatsStore } from './data/store/frenzy-stats.store';
import { FrenzyStore } from './data/store/frenzy.store';
import { FrenzyPageFacade } from './ui/components/frenzy-page/frenzy-page.facade';
import { DeathEpitaphService } from './ui/services/death-epitaph.service';

// Feature-scoped DI graph for Frenzy: every store, effect producer and per-effect sound service that must live and
// die with the lazy route. Kept out of `frenzy.routes.ts` (which is about routing, not the DI graph) and spread into
// the route's `providers`. Adding a new sound/effect → one line here, not in the route file.
export const FRENZY_PROVIDERS: Provider[] = [
  FrenzySocketService,
  FrenzyStore,
  FrenzyStatsStore,
  FloatingMessagesStore,
  EatEffect,
  EvolutionEffect,
  DetonationEffect,
  BumpEffect,
  HitBurstEffect,
  ShieldBlockEffect,
  PresenceTracker,
  PlayerEffectsTracker,
  EmissionSoundEffect,
  SelfMoodEffect,
  ReactiveMoodEffect,
  IntroQuipsEffect,
  NpcQuipEffect,
  FrenzyEffectsService,
  FrenzyPageFacade,
  DeathEpitaphService,
  PlayerPersistenceService,
  AudioEngineService,
  BadEatSoundService,
  BrickSoundService,
  EasterEggSoundService,
  EatSoundService,
  EggEmissionSoundService,
  EvolveSoundService,
  ExplosionSoundService,
  PoopEatSoundService,
  PoopEmissionSoundService,
  RockSoundService,
  ShieldSoundService,
  SoundSettingsService,
  WellFedSoundService,
];
