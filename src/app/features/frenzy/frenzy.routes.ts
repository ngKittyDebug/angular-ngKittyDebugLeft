import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { FrenzyEffectsService } from './data/services/frenzy-effects.service';
import { FrenzySocketService } from './data/services/frenzy-socket.service';
import { SessionTokenService } from './data/services/session-token.service';
import { AudioEngineService } from './data/services/sound/audio-engine.service';
import { BadEatSoundService } from './data/services/sound/bad-eat-sound.service';
import { EatSoundService } from './data/services/sound/eat-sound.service';
import { EvolveSoundService } from './data/services/sound/evolve-sound.service';
import { ExplosionSoundService } from './data/services/sound/explosion-sound.service';
import { RockSoundService } from './data/services/sound/rock-sound.service';
import { SoundSettingsService } from './data/services/sound/sound-settings.service';
import { FrenzyStatsStore } from './data/store/frenzy-stats.store';
import { FrenzyStore } from './data/store/frenzy.store';
import { FrenzyPageFacade } from './ui/components/frenzy-page/frenzy-page.facade';

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
      FrenzyEffectsService,
      FrenzyPageFacade,
      SessionTokenService,
      AudioEngineService,
      BadEatSoundService,
      EatSoundService,
      EvolveSoundService,
      ExplosionSoundService,
      RockSoundService,
      SoundSettingsService,
    ],
  },
];
