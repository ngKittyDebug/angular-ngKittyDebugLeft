import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, type MockedObject } from 'vitest';

import { PokemonBattlePageComponent } from './pokemon-battle-page.component';
import { PokemonBattleStore } from '../../../data/store/pokemon-battle.store';
import {
  createPokemonBattleStoreMock,
  type StoreType,
} from '../../../data/mocks/pokemon-battle-store.mock';

import { TranslocoTestingModule } from '@jsverse/transloco';
import { AudioManagerService } from '../../../data/services/audio-manager.service';
import { BotPlayerService } from '../../../data/services/bot-player.service';

describe('PokemonBattlePageComponent', () => {
  let mockStore: MockedObject<Partial<StoreType>>;

  beforeEach(() => {
    mockStore = createPokemonBattleStoreMock();

    TestBed.configureTestingModule({
      imports: [
        PokemonBattlePageComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: PokemonBattleStore, useValue: mockStore },
        AudioManagerService,
        BotPlayerService,
      ],
    });
  });

  describe('Happy Path', () => {
    it('должен правильно инициализироваться и отображать страницу', () => {
      const fixture = TestBed.createComponent(PokemonBattlePageComponent);

      fixture.detectChanges();

      const component = fixture.componentInstance;

      expect(component).toBeDefined();
      expect(component.battleStarted()).toBe(true);
    });
  });
});
