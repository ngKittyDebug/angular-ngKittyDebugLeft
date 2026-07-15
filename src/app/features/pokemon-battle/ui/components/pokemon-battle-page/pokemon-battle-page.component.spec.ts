import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';

import { PokemonBattlePageComponent } from './pokemon-battle-page.component';
import { PokemonBattleStore } from '../../../data/store/pokemon-battle.store';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
  SQUIRTLE_FIXTURE,
} from '../../../data/fixtures/pokemon.fixture';

import { TranslocoTestingModule } from '@jsverse/transloco';

type Public<T> = { [K in keyof T as K extends string ? K : never]: T[K] };
type StoreType = Public<InstanceType<typeof PokemonBattleStore>>;

describe('PokemonBattlePageComponent', () => {
  let mockStore: MockedObject<Partial<StoreType>>;

  beforeEach(() => {
    mockStore = {
      pokemonList: signal([
        BULBASAUR_FIXTURE,
        CHARMANDER_FIXTURE,
        SQUIRTLE_FIXTURE,
        IVYSAUR_FIXTURE,
      ]),
      selectedTeam: signal([BULBASAUR_FIXTURE, SQUIRTLE_FIXTURE]),
      opponentTeam: signal([CHARMANDER_FIXTURE, IVYSAUR_FIXTURE]),
      battleStarted: signal(true),
      currentPage: signal(0),
      totalCount: signal(4),
      limit: signal(10),
      isLoading: signal(false),
      error: signal(null),
      loadPokemonList: vi.fn() as unknown as StoreType['loadPokemonList'],
      selectPokemonForTeam: vi.fn() as unknown as StoreType['selectPokemonForTeam'],
      clearSelectedTeam: vi.fn() as unknown as StoreType['clearSelectedTeam'],
      startBattle: vi.fn() as unknown as StoreType['startBattle'],
      endBattle: vi.fn() as unknown as StoreType['endBattle'],
    } as const satisfies MockedObject<Partial<StoreType>>;

    TestBed.configureTestingModule({
      imports: [
        PokemonBattlePageComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [{ provide: PokemonBattleStore, useValue: mockStore }],
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
