import { describe, expect, it } from 'vitest';

import { BattleEngine } from '@game/pokemon-battle/battle-engine';
import type { BattleCommand, BattlePokemon } from '@game/pokemon-battle/types';

describe('BattleEngine', () => {
  describe('Happy Path', () => {
    describe('Инициализация', () => {
      it('должен правильно инициализировать состояние боя в режиме 1 на 1', () => {
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
          {
            id: 2,
            name: 'ivysaur',
            maxHp: 60,
            hp: 60,
            stats: { hp: 60, attack: 62, defense: 63, speed: 60 },
            types: ['grass', 'poison'],
            sprites: { front: 'ivysaur-front.png', back: 'ivysaur-back.png' },
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
          {
            id: 5,
            name: 'charmeleon',
            maxHp: 58,
            hp: 58,
            stats: { hp: 58, attack: 64, defense: 58, speed: 80 },
            types: ['fire'],
            sprites: { front: 'charmeleon-front.png', back: 'charmeleon-back.png' },
            moves: [{ name: 'scratch', type: 'normal', power: 40 }],
          },
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
      it('должен вычислять урон по формуле и уменьшать HP цели, а также обрабатывать потерю сознания (faint) и конец боя', () => {
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

        // 1. Проверяем события
        expect(events).toBeDefined();

        // События использования атак
        const moveEvents = events.filter((event_) => event_.type === 'use-move');

        expect(moveEvents).toHaveLength(2);
        expect(moveEvents[0].payload?.attackerId).toBe(4); // charmander ходит первым

        // События нанесения урона
        const damageEvents = events.filter((event_) => event_.type === 'damage');

        expect(damageEvents).toHaveLength(2);

        // Первое событие (Charmander scratch по Bulbasaur)
        // Урон = Math.floor(40 * (52 / 49) * 1.0 * 1.0) = 42
        expect(damageEvents[0].payload?.targetId).toBe(1);
        expect(damageEvents[0].payload?.damage).toBe(42);
        expect(damageEvents[0].payload?.hpBefore).toBe(45);
        expect(damageEvents[0].payload?.hpAfter).toBe(3);

        // Второе событие (Bulbasaur tackle по Charmander)
        // Урон = Math.floor(40 * (49 / 43) * 1.0 * 1.0) = 45
        expect(damageEvents[1].payload?.targetId).toBe(4);
        expect(damageEvents[1].payload?.damage).toBe(45);
        expect(damageEvents[1].payload?.hpBefore).toBe(39);
        expect(damageEvents[1].payload?.hpAfter).toBe(0);

        // Событие потери сознания
        const faintEvents = events.filter((event_) => event_.type === 'faint');

        expect(faintEvents).toHaveLength(1);
        expect(faintEvents[0].payload?.pokemonId).toBe(4); // charmander потерял сознание

        // Событие завершения боя
        const gameOverEvents = events.filter((event_) => event_.type === 'battle-over');

        expect(gameOverEvents).toHaveLength(1);
        expect(gameOverEvents[0].payload?.winner).toBe('player');

        // 2. Проверяем обновление состояния в движке
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
  });
});
