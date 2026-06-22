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
import { FrenzyStorageService } from './data/services/frenzy-storage.service';
import { PlayerPersistenceService } from './data/services/player-persistence.service';
import { AudioEngineService } from './data/services/sound/audio-engine.service';
import { SoundPlayerService } from './data/services/sound/sound-player.service';
import { SoundSettingsService } from './data/services/sound/sound-settings.service';
import { FrenzyStatsStore } from './data/store/frenzy-stats.store';
import { FrenzyStore } from './data/store/frenzy.store';
import { FrenzyPageFacade } from './ui/components/frenzy-page/frenzy-page.facade';
import { DeathEpitaphService } from './ui/services/death-epitaph.service';

// Feature-scoped DI graph for Frenzy: every store, effect producer and the sound subsystem that must live and
// die with the lazy route. Kept out of `frenzy.routes.ts` (which is about routing, not the DI graph) and spread into
// the route's `providers`. Adding a new effect → one line here, not in the route file; a new sound is a registry entry.
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
  FrenzyStorageService,
  PlayerPersistenceService,
  AudioEngineService,
  SoundPlayerService,
  SoundSettingsService,
];
