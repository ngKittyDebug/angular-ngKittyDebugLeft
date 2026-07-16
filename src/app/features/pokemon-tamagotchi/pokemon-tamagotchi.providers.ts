import type { Provider } from '@angular/core';

import { TamagotchiFacade } from './data/facades/tamagotchi.facade';
import { EvolutionService } from './data/services/evolution.service';
import { PerformanceService } from './data/services/performance.service';
import { StatusDecayService } from './data/services/status-decay.service';
import { TamagotchiInitService } from './data/services/tamagotchi-init.service';
import { TamagotchiLoggerService } from './data/services/tamagotchi-logger.service';
import { TamagotchiNotificationService } from './data/services/tamagotchi-notification.service';
import { TamagotchiPersistenceService } from './data/services/tamagotchi-persistence.service';
import { TamagotchiService } from './data/services/tamagotchi.service';
import { TimerService } from './data/services/timer.service';
import { TamagotchiStore } from './data/store/tamagotchi.store';
import { AnimationService } from './ui/services/animation.service';

export const POKEMON_TAMAGOTCHI_PROVIDERS: Provider[] = [
  TamagotchiStore,
  TamagotchiFacade,
  TamagotchiService,
  TimerService,
  EvolutionService,
  PerformanceService,
  StatusDecayService,
  TamagotchiInitService,
  TamagotchiLoggerService,
  TamagotchiPersistenceService,
  AnimationService,
  TamagotchiNotificationService,
];
