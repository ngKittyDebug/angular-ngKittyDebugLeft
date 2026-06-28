import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { PokemonBattlePageComponent } from './pokemon-battle-page.component';
import { PokemonBattleStore } from '../../../data/store/pokemon-battle.store';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
  SQUIRTLE_FIXTURE,
} from '../../../data/fixtures/pokemon.fixture';

describe('PokemonBattlePageComponent', () => {
  let mockStore: any;

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
      loadPokemons: vi.fn(),
      selectPokemonForTeam: vi.fn(),
      clearSelectedTeam: vi.fn(),
      startBattle: vi.fn(),
      endBattle: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [PokemonBattlePageComponent],
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
