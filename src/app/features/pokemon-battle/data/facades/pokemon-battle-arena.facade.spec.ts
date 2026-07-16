import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { PokemonBattleArenaFacade } from './pokemon-battle-arena.facade';
import { BotPlayerService } from '../services/bot-player.service';
import { AudioManagerService } from '../services/audio-manager.service';
import { PokemonBattleStore } from '../store/pokemon-battle.store';
import { createPokemonBattleStoreMock, type StoreType } from '../mocks/pokemon-battle-store.mock';

describe('PokemonBattleArenaFacade', () => {
  let mockStore: MockedObject<Partial<StoreType>>;
  let mockAudioManager: MockedObject<Partial<AudioManagerService>>;
  let mockBotPlayerService: MockedObject<Partial<BotPlayerService>>;
  let facade: PokemonBattleArenaFacade;

  beforeEach(() => {
    mockStore = createPokemonBattleStoreMock();

    mockAudioManager = {
      enabled: signal(true),
      volume: signal(0.3),
      toggle: vi.fn(),
      setVolume: vi.fn(),
      playCry: vi.fn(),
      setEnabled: vi.fn(),
    } as const satisfies MockedObject<Partial<AudioManagerService>>;

    mockBotPlayerService = {
      getCommandList: vi.fn().mockReturnValue([]),
    } as const satisfies MockedObject<Partial<BotPlayerService>>;

    TestBed.configureTestingModule({
      providers: [
        PokemonBattleArenaFacade,
        { provide: PokemonBattleStore, useValue: mockStore },
        { provide: AudioManagerService, useValue: mockAudioManager },
        { provide: BotPlayerService, useValue: mockBotPlayerService },
      ],
    });

    facade = TestBed.inject(PokemonBattleArenaFacade);
  });

  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализироваться и создавать состояние боя', () => {
        expect(facade).toBeDefined();
        expect(facade.battleState()).not.toBeNull();
        expect(facade.battleState()?.playerSide.pokemons[0].name).toBe('bulbasaur');
        expect(facade.activeAlivePlayerPokemonList().length).toBe(2);
      });
    });

    describe('Управление звуком', () => {
      it('должен переключать звук', () => {
        facade.toggleMute();
        expect(mockAudioManager.toggle).toHaveBeenCalledTimes(1);
      });

      it('должен изменять громкость', () => {
        facade.changeVolume(0.5);
        expect(mockAudioManager.setVolume).toHaveBeenNthCalledWith(1, 0.5);
      });
    });

    describe('Выбор атак и целей', () => {
      it('должен переходить к следующему покемону при выборе приема и цели', () => {
        expect(facade.selectedMove()).toBeNull();

        const move = facade.activeAlivePlayerPokemonList()[0].moves[0];

        facade.selectMove(move);
        expect(facade.selectedMove()?.name).toBe(move.name);

        const target = facade.activeAliveOpponentPokemonList()[0];

        facade.selectTarget(target);

        expect(facade.currentSelectingPokemonIndex()).toBe(1);
        expect(facade.selectedMove()).toBeNull();
      });

      it('должен сбрасывать выбранный прием', () => {
        const move = facade.activeAlivePlayerPokemonList()[0].moves[0];

        facade.selectMove(move);

        facade.cancelMoveSelection();

        expect(facade.selectedMove()).toBeNull();
      });

      it('должен очищать выбор раунда', () => {
        const move = facade.activeAlivePlayerPokemonList()[0].moves[0];

        facade.selectMove(move);
        facade.selectTarget(facade.activeAliveOpponentPokemonList()[0]);

        facade.resetSelection();

        expect(facade.currentSelectingPokemonIndex()).toBe(0);
        expect(facade.pendingCommandList().length).toBe(0);
        expect(facade.selectedMove()).toBeNull();
      });

      it('должен корректно обновлять список живых активных покемонов после разрешения хода', () => {
        // Устанавливаем HP первого покемона соперника в 1 в сторе и сбрасываем бой,
        // чтобы движок создался с этим значением HP
        const opponentTeamSignal = mockStore.opponentTeam as any;
        const opponentTeam = structuredClone(opponentTeamSignal());

        opponentTeam[0].hp = 1;
        opponentTeamSignal.set(opponentTeam);
        facade.resetBattle();

        expect(facade.activeAliveOpponentPokemonList().length).toBe(2);

        const firstActivePlayer = facade.activeAlivePlayerPokemonList()[0];
        const move1 = firstActivePlayer.moves[0];

        facade.selectMove(move1);

        const target1 = facade.activeAliveOpponentPokemonList()[0];

        facade.selectTarget(target1);

        const secondActivePlayer = facade.activeAlivePlayerPokemonList()[1];
        const move2 = secondActivePlayer.moves[0];

        facade.selectMove(move2);

        const target2 = facade.activeAliveOpponentPokemonList()[0];

        facade.selectTarget(target2);

        const state = facade.battleState();

        expect(state?.opponentSide.pokemons[0].hp).toBe(0);
        expect(facade.activeAliveOpponentPokemonList().length).toBe(1);
      });
    });
  });
});
