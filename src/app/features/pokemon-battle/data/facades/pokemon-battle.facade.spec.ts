import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PokemonBattleFacade } from './pokemon-battle.facade';
import { BotPlayerService } from '../services/bot-player.service';
import { AudioManagerService } from '../services/audio-manager.service';
import { PokemonBattleStore } from '../store/pokemon-battle.store';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
  SQUIRTLE_FIXTURE,
} from '../fixtures/pokemon.fixture';

describe('PokemonBattleFacade', () => {
  let mockStore: any;
  let mockAudioManager: any;
  let mockBotPlayerService: any;
  let facade: PokemonBattleFacade;

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

    mockAudioManager = {
      enabled: signal(true),
      volume: signal(0.3),
      toggle: vi.fn(),
      setVolume: vi.fn(),
    };

    mockBotPlayerService = {
      getCommands: vi.fn().mockReturnValue([]),
    };

    TestBed.configureTestingModule({
      providers: [
        PokemonBattleFacade,
        { provide: PokemonBattleStore, useValue: mockStore },
        { provide: AudioManagerService, useValue: mockAudioManager },
        { provide: BotPlayerService, useValue: mockBotPlayerService },
      ],
    });

    facade = TestBed.inject(PokemonBattleFacade);
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализироваться и загружать покемонов', () => {
        expect(facade).toBeDefined();
        expect(mockStore.loadPokemons).toHaveBeenCalledTimes(1);
        expect(facade.battleState()).not.toBeNull();
        expect(facade.battleState()?.playerSide.pokemons[0].name).toBe('bulbasaur');
        expect(facade.activeAlivePlayerPokemons().length).toBe(2);
      });
    });

    describe('Управление звуком', () => {
      it('должен вызывать AudioManager.toggle при toggleMute', () => {
        facade.toggleMute();
        expect(mockAudioManager.toggle).toHaveBeenCalledTimes(1);
      });

      it('должен вызывать AudioManager.setVolume при изменении громкости', () => {
        facade.onVolumeChange(0.5);
        expect(mockAudioManager.setVolume).toHaveBeenCalledWith(0.5);
      });
    });

    describe('Выбор атак и целей', () => {
      it('должен переключать выбранный прием и цель', () => {
        expect(facade.selectedMove()).toBeNull();

        facade.onSelectMove('tackle');
        expect(facade.selectedMove()?.name).toBe('tackle');

        const target = facade.activeAliveOpponentPokemons()[0];

        facade.onSelectTarget(target);

        // Первый покемон выбрал атаку, ход переходит ко второму
        expect(facade.currentSelectingPokemonIndex()).toBe(1);
        expect(facade.selectedMove()).toBeNull();
      });

      it('должен сбрасывать выбранный прием при cancelMoveSelection', () => {
        facade.onSelectMove('tackle');
        expect(facade.selectedMove()?.name).toBe('tackle');

        facade.cancelMoveSelection();
        expect(facade.selectedMove()).toBeNull();
      });

      it('должен очищать все выбранные приемы при resetSelection', () => {
        facade.onSelectMove('tackle');
        facade.onSelectTarget(facade.activeAliveOpponentPokemons()[0]);

        expect(facade.currentSelectingPokemonIndex()).toBe(1);
        expect(facade.pendingCommands().length).toBe(1);

        facade.resetSelection();

        expect(facade.currentSelectingPokemonIndex()).toBe(0);
        expect(facade.pendingCommands().length).toBe(0);
        expect(facade.selectedMove()).toBeNull();
      });
    });
  });
});
