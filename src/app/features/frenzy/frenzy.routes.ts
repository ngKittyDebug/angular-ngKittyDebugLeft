import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { DetonationEffect } from './data/services/effects/detonation-effect.service';
import { EatEffect } from './data/services/effects/eat-effect.service';
import { EvolutionEffect } from './data/services/effects/evolution-effect.service';
import { FloatingMessagesStore } from './data/services/effects/floating-messages.store';
import { PlayerEffectsTracker } from './data/services/effects/player-effects-tracker.service';
import { PresenceTracker } from './data/services/effects/presence-tracker.service';
import { SelfMoodEffect } from './data/services/effects/self-mood-effect.service';
import { FrenzyEffectsService } from './data/services/frenzy-effects.service';
import { FrenzySocketService } from './data/services/frenzy-socket.service';
import { SessionTokenService } from './data/services/session-token.service';
import { AudioEngineService } from './data/services/sound/audio-engine.service';
import { BadEatSoundService } from './data/services/sound/bad-eat-sound.service';
import { EasterEggSoundService } from './data/services/sound/easter-egg-sound.service';
import { EatSoundService } from './data/services/sound/eat-sound.service';
import { EvolveSoundService } from './data/services/sound/evolve-sound.service';
import { ExplosionSoundService } from './data/services/sound/explosion-sound.service';
import { RockSoundService } from './data/services/sound/rock-sound.service';
import { ShieldSoundService } from './data/services/sound/shield-sound.service';
import { SoundSettingsService } from './data/services/sound/sound-settings.service';
import { WellFedSoundService } from './data/services/sound/well-fed-sound.service';
import { FrenzyStatsStore } from './data/store/frenzy-stats.store';
import { FrenzyStore } from './data/store/frenzy.store';
import { FrenzyPageFacade } from './ui/components/frenzy-page/frenzy-page.facade';

export const FRENZY_PATH = 'frenzy';
export const frenzyRoutes: Routes = [
  {
    path: 'frenzy',
    loadComponent: () =>
      import('./ui/components/frenzy-page/frenzy-page.component').then(
        (m) => m.FrenzyPageComponent,
      ),
    providers: [
      provideTranslocoScope('frenzy'),
      FrenzySocketService,
      FrenzyStore,
      FrenzyStatsStore,
      FloatingMessagesStore,
      EatEffect,
      EvolutionEffect,
      DetonationEffect,
      PresenceTracker,
      PlayerEffectsTracker,
      SelfMoodEffect,
      FrenzyEffectsService,
      FrenzyPageFacade,
      SessionTokenService,
      AudioEngineService,
      BadEatSoundService,
      EasterEggSoundService,
      EatSoundService,
      EvolveSoundService,
      ExplosionSoundService,
      RockSoundService,
      ShieldSoundService,
      SoundSettingsService,
      WellFedSoundService,
    ],
  },
];
