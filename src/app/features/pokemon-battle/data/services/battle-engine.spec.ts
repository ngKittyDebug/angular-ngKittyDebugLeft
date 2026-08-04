import { describe, expect, it } from 'vitest';

import { BattleEngine } from './battle-engine';
import type { BattleCommand, BattleEvent, BattlePokemon } from '../models/battle.model';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
} from '../fixtures/pokemon.fixture';

// A mock Charmeleon fixture for testing
const CHARMELEON_FIXTURE: BattlePokemon = {
  id: 5,
  name: 'charmeleon',
  maxHp: 58,
  hp: 58,
  stats: { hp: 58, attack: 64, defense: 58, speed: 80 },
  types: ['fire'],
  sprites: {
    front: 'charmeleon-front.png',
    back: 'charmeleon-back.png',
  },
  moves: [{ name: 'scratch', type: 'normal', power: 40 }],
};

describe('BattleEngine', () => {
  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализировать состояние боя в режиме 1 на 1', () => {
        const playerPokemons: BattlePokemon[] = [structuredClone(BULBASAUR_FIXTURE)];
        const opponentPokemons: BattlePokemon[] = [structuredClone(CHARMANDER_FIXTURE)];

        const engine = new BattleEngine(playerPokemons, opponentPokemons);
        const state = engine.getState();

        expect(state.status).toBe('waiting-for-commands');
        expect(state.turn).toBe(1);
        expect(state.winner).toBeNull();
        expect(state.playerSide.pokemons[0].name).toBe('bulbasaur');
        expect(state.playerSide.activePokemonIds).toEqual([1]);
        expect(state.opponentSide.pokemons[0].name).toBe('charmander');
        expect(state.opponentSide.activePokemonIds).toEqual([4]);
      });

      it('должен правильно инициализировать состояние боя в режиме 2 на 2 (Doubles)', () => {
        const playerPokemons: BattlePokemon[] = [
          structuredClone(BULBASAUR_FIXTURE),
          structuredClone(IVYSAUR_FIXTURE),
        ];
        const opponentPokemons: BattlePokemon[] = [
          structuredClone(CHARMANDER_FIXTURE),
          structuredClone(CHARMELEON_FIXTURE),
        ];

        const engine = new BattleEngine(playerPokemons, opponentPokemons, true);
        const state = engine.getState();

        expect(state.playerSide.activePokemonIds).toEqual([1, 2]);
        expect(state.opponentSide.activePokemonIds).toEqual([4, 5]);
      });
    });

    describe('Turn Resolution (Speed)', () => {
      it('должен упорядочивать выполнение атак по скорости (быстрый покемон атакует первым)', () => {
        const playerPokemons: BattlePokemon[] = [
          {
            id: 1,
            name: 'bulbasaur',
            maxHp: 45,
            hp: 45,
            stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
            types: ['grass', 'poison'],
            sprites: { front: 'bulbasaur-front.png', back: 'bulbasaur-back.png' },
            moves: [{ name: 'tackle', type: 'normal', power: 40 }],
          },
        ];
        const opponentPokemons: BattlePokemon[] = [
          {
            id: 4,
            name: 'charmander',
            maxHp: 39,
            hp: 39,
            stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
            types: ['fire'],
            sprites: { front: 'charmander-front.png', back: 'charmander-back.png' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
        ];

        const engine = new BattleEngine(playerPokemons, opponentPokemons);
        const playerCommands: BattleCommand[] = [{ pokemonId: 1, moveName: 'tackle', targetId: 4 }];
        const opponentCommands: BattleCommand[] = [
          { pokemonId: 4, moveName: 'scratch', targetId: 1 },
        ];

        const events = engine.resolveTurn(playerCommands, opponentCommands);

        expect(events).toBeDefined();
        const moveEvents = events.filter((event_) => event_.type === 'use-move');

        expect(moveEvents).toHaveLength(2);
        expect(moveEvents[0].payload?.attackerId).toBe(4); // charmander (faster)
        expect(moveEvents[1].payload?.attackerId).toBe(1); // bulbasaur (slower)
      });
    });

    describe('Turn Resolution (Damage, HP & Status)', () => {
      let engine: BattleEngine;
      let events: BattleEvent[];

      beforeEach(() => {
        const playerPokemons: BattlePokemon[] = [structuredClone(BULBASAUR_FIXTURE)];
        const opponentPokemons: BattlePokemon[] = [structuredClone(CHARMANDER_FIXTURE)];

        engine = new BattleEngine(playerPokemons, opponentPokemons);
        const playerCommands: BattleCommand[] = [{ pokemonId: 1, moveName: 'tackle', targetId: 4 }];
        const opponentCommands: BattleCommand[] = [
          { pokemonId: 4, moveName: 'scratch', targetId: 1 },
        ];

        events = engine.resolveTurn(playerCommands, opponentCommands);
      });

      it('должен генерировать события использования атак', () => {
        const moveEvents = events.filter((event_) => event_.type === 'use-move');

        expect(moveEvents).toHaveLength(2);
        expect(moveEvents[0].payload?.attackerId).toBe(4);
      });

      it('должен вычислять урон по формуле и генерировать события damage', () => {
        const damageEvents = events.filter((event_) => event_.type === 'damage');

        expect(damageEvents).toHaveLength(2);

        expect(damageEvents[0].payload?.targetId).toBe(1);
        expect(damageEvents[0].payload?.damage).toBe(42);
        expect(damageEvents[0].payload?.hpBefore).toBe(45);
        expect(damageEvents[0].payload?.hpAfter).toBe(3);

        expect(damageEvents[1].payload?.targetId).toBe(4);
        expect(damageEvents[1].payload?.damage).toBe(45);
        expect(damageEvents[1].payload?.hpBefore).toBe(39);
        expect(damageEvents[1].payload?.hpAfter).toBe(0);
      });

      it('должен обрабатывать потерю сознания (faint)', () => {
        const faintEvents = events.filter((event_) => event_.type === 'faint');

        expect(faintEvents).toHaveLength(1);
        expect(faintEvents[0].payload?.pokemonId).toBe(4);
      });

      it('должен завершать бой и обновлять состояние', () => {
        const gameOverEvents = events.filter((event_) => event_.type === 'battle-over');

        expect(gameOverEvents).toHaveLength(1);
        expect(gameOverEvents[0].payload?.winner).toBe('player');

        const state = engine.getState();

        expect(state.playerSide.pokemons[0].hp).toBe(3);
        expect(state.opponentSide.pokemons[0].hp).toBe(0);
        expect(state.status).toBe('finished');
        expect(state.winner).toBe('player');
      });
    });

    describe('Turn Resolution (Type Effectiveness)', () => {
      it('должен правильно применять множители типов при расчете урона', () => {
        const playerPokemons: BattlePokemon[] = [
          {
            id: 1,
            name: 'bulbasaur',
            maxHp: 45,
            hp: 45,
            stats: { hp: 45, attack: 49, defense: 49, speed: 45 },
            types: ['grass', 'poison'],
            sprites: { front: 'bulbasaur-front.png', back: 'bulbasaur-back.png' },
            moves: [{ name: 'vine-whip', type: 'grass', power: 45 }], // Травяной тип
          },
        ];
        const opponentPokemons: BattlePokemon[] = [
          {
            id: 4,
            name: 'charmander',
            maxHp: 39,
            hp: 39,
            stats: { hp: 39, attack: 52, defense: 43, speed: 65 },
            types: ['fire'], // Огненный тип (сопротивление к траве, х0.5)
            sprites: { front: 'charmander-front.png', back: 'charmander-back.png' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
        ];

        const engine = new BattleEngine(playerPokemons, opponentPokemons);
        const playerCommands: BattleCommand[] = [
          { pokemonId: 1, moveName: 'vine-whip', targetId: 4 },
        ];
        const opponentCommands: BattleCommand[] = [
          { pokemonId: 4, moveName: 'scratch', targetId: 1 },
        ];

        const events = engine.resolveTurn(playerCommands, opponentCommands);

        // Находим событие нанесения урона по Чармандеру
        const bulbasaurDamageEvent = events.find(
          (event_) => event_.type === 'damage' && event_.payload?.targetId === 4,
        );

        expect(bulbasaurDamageEvent).toBeDefined();

        // Урон: 45 (power) * (49/43) (Atk/Def) * 0.5 (эффективность Grass vs Fire) * 1.5 (STAB)
        // 45 * 1.1395 * 0.5 * 1.5 = 38.45 => Math.floor(38.45) = 38
        expect(bulbasaurDamageEvent?.payload?.damage).toBe(38);
        expect(bulbasaurDamageEvent?.payload?.hpAfter).toBe(1); // 39 - 38 = 1

        const state = engine.getState();

        expect(state.status).toBe('waiting-for-commands');
        expect(state.turn).toBe(2); // Раунд увеличился
      });
    });

    describe('Doubles & Redirection', () => {
      it('должен перенаправлять атаку на другого активного покемона противника, если первоначальная цель потеряла сознание в этом же раунде', () => {
        const playerPokemons: BattlePokemon[] = [
          {
            id: 1,
            name: 'bulbasaur',
            maxHp: 45,
            hp: 45,
            stats: { hp: 45, attack: 50, defense: 50, speed: 100 }, // Очень быстрый
            types: ['grass'],
            sprites: { front: '', back: '' },
            moves: [{ name: 'tackle', type: 'normal', power: 40 }],
          },
          {
            id: 2,
            name: 'ivysaur',
            maxHp: 60,
            hp: 60,
            stats: { hp: 60, attack: 50, defense: 50, speed: 50 }, // Медленнее
            types: ['grass'],
            sprites: { front: '', back: '' },
            moves: [{ name: 'tackle', type: 'normal', power: 40 }],
          },
        ];
        const opponentPokemons: BattlePokemon[] = [
          {
            id: 4,
            name: 'charmander',
            maxHp: 10, // Мало здоровья, упадет с одного удара
            hp: 10,
            stats: { hp: 10, attack: 50, defense: 50, speed: 10 }, // Очень медленный
            types: ['fire'],
            sprites: { front: '', back: '' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
          {
            id: 5,
            name: 'charmeleon',
            maxHp: 80,
            hp: 80,
            stats: { hp: 80, attack: 50, defense: 50, speed: 20 },
            types: ['fire'],
            sprites: { front: '', back: '' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
        ];

        const engine = new BattleEngine(playerPokemons, opponentPokemons, true);

        // Оба атакуют Charmander (id 4)
        const playerCommands: BattleCommand[] = [
          { pokemonId: 1, moveName: 'tackle', targetId: 4 }, // Убьет его
          { pokemonId: 2, moveName: 'tackle', targetId: 4 }, // Должен перенаправиться на Charmeleon (id 5)
        ];
        const opponentCommands: BattleCommand[] = [];

        const events = engine.resolveTurn(playerCommands, opponentCommands);

        // Charmander (id 4) должен потерять сознание
        const faintCharmander = events.find(
          (event_) => event_.type === 'faint' && event_.payload?.pokemonId === 4,
        );

        expect(faintCharmander).toBeDefined();

        // Атака Ivysaur (id 2) должна перенаправиться на Charmeleon (id 5)
        // Ищем событие использования приема Ivysaur (id 2)
        const ivysaurMove = events.find(
          (event_) => event_.type === 'use-move' && event_.payload?.attackerId === 2,
        );

        expect(ivysaurMove).toBeDefined();
        expect(ivysaurMove?.payload?.targetId).toBe(5); // Перенаправлено на 5!

        // Ищем событие получения урона Charmeleon (id 5)
        const charmeleonDamage = events.find(
          (event_) => event_.type === 'damage' && event_.payload?.targetId === 5,
        );

        expect(charmeleonDamage).toBeDefined();
        expect(charmeleonDamage?.payload?.damage).toBeGreaterThan(0);

        // Проверяем конечное состояние
        const state = engine.getState();

        expect(state.opponentSide.pokemons.find((p) => p.id === 4)?.hp).toBe(0);
        expect(state.opponentSide.pokemons.find((p) => p.id === 5)?.hp).toBeLessThan(80);
      });
    });
  });
});
