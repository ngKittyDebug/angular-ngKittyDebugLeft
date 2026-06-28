import type { BattleCommand, BattleEvent, BattlePokemon, BattleState } from './types';

export const TYPE_CHART: Record<string, Record<string, number>> = {
  fire: { grass: 2, fire: 0.5, water: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5 },
  water: { fire: 2, water: 0.5, grass: 0.5 },
  poison: { grass: 2, poison: 0.5 },
};

export function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  let effectiveness = 1.0;
  const moveTypeLower = moveType.toLowerCase();
  const interactions = TYPE_CHART[moveTypeLower];

  if (!interactions) {
    return effectiveness;
  }
  for (const type of defenderTypes) {
    const typeLower = type.toLowerCase();

    if (interactions[typeLower] !== undefined) {
      effectiveness *= interactions[typeLower];
    }
  }

  return effectiveness;
}

export class BattleEngine {
  private state: BattleState;

  constructor(
    playerPokemons: BattlePokemon[],
    opponentPokemons: BattlePokemon[],
    isDoubles = false,
  ) {
    this.state = {
      playerSide: {
        playerType: 'player',
        pokemons: playerPokemons.map((p) => ({ ...p, hp: p.hp ?? p.maxHp })),
        activePokemonIds: playerPokemons.slice(0, isDoubles ? 2 : 1).map((p) => p.id),
      },
      opponentSide: {
        playerType: 'bot',
        pokemons: opponentPokemons.map((p) => ({ ...p, hp: p.hp ?? p.maxHp })),
        activePokemonIds: opponentPokemons.slice(0, isDoubles ? 2 : 1).map((p) => p.id),
      },
      status: 'waiting-for-commands',
      winner: null,
      turn: 1,
    };
  }

  public getState(): BattleState {
    return this.state;
  }

  public resolveTurn(
    playerCommands: BattleCommand[],
    opponentCommands: BattleCommand[],
  ): BattleEvent[] {
    this.state.status = 'resolving-turn';

    const events: BattleEvent[] = [];

    // Filter and sort active commands by pokemon speed
    const allCommands = [...playerCommands, ...opponentCommands];

    allCommands.sort((a, b) => {
      const speedA = this.findPokemon(a.pokemonId)?.stats.speed ?? 0;
      const speedB = this.findPokemon(b.pokemonId)?.stats.speed ?? 0;

      return speedB - speedA;
    });

    for (const cmd of allCommands) {
      // 1. Check if attacker is still alive
      const attacker = this.findPokemon(cmd.pokemonId);

      if (!attacker || attacker.hp <= 0) {
        continue;
      }

      // 2. Check if target is alive
      const defender = this.findPokemon(cmd.targetId);

      if (!defender || defender.hp <= 0) {
        continue;
      }

      // 3. Find move or use default
      const move = attacker.moves.find((m) => m.name.toLowerCase() === cmd.moveName.toLowerCase());
      const power = move ? move.power : 40;
      const moveType = move ? move.type : 'normal';

      // 4. Emit move event
      events.push({
        type: 'use-move',
        message: `${attacker.name} used ${cmd.moveName}!`,
        payload: {
          attackerId: attacker.id,
          moveName: cmd.moveName,
          targetId: defender.id,
        },
      });

      // 5. Calculate damage
      const effectiveness = getTypeEffectiveness(moveType, defender.types);
      const isStab = attacker.types.map((t) => t.toLowerCase()).includes(moveType.toLowerCase());
      const stab = isStab ? 1.5 : 1.0;

      const damage = Math.floor(
        power * (attacker.stats.attack / defender.stats.defense) * effectiveness * stab,
      );

      const hpBefore = defender.hp;
      const hpAfter = Math.max(0, defender.hp - damage);

      defender.hp = hpAfter;

      // 6. Emit damage event
      events.push({
        type: 'damage',
        message: `${defender.name} took ${damage} damage!`,
        payload: {
          targetId: defender.id,
          damage,
          hpBefore,
          hpAfter,
        },
      });

      // 7. Check if fainted
      if (hpAfter === 0) {
        events.push({
          type: 'faint',
          message: `${defender.name} fainted!`,
          payload: {
            pokemonId: defender.id,
          },
        });
      }

      // 8. Check if battle is over
      const isPlayerDefeated = this.state.playerSide.pokemons.every((p) => p.hp <= 0);
      const isOpponentDefeated = this.state.opponentSide.pokemons.every((p) => p.hp <= 0);

      if (isPlayerDefeated || isOpponentDefeated) {
        const winner = isPlayerDefeated ? 'opponent' : 'player';

        this.state.status = 'finished';
        this.state.winner = winner;

        events.push({
          type: 'battle-over',
          message: `Battle over! Winner is ${winner}!`,
          payload: {
            winner,
          },
        });

        break; // Battle ends immediately
      }
    }

    if (this.state.status !== 'finished') {
      this.state.turn += 1;
      this.state.status = 'waiting-for-commands';
    }

    return events;
  }

  private findPokemon(id: number): BattlePokemon | null {
    const playerPoke = this.state.playerSide.pokemons.find((p) => p.id === id);

    if (playerPoke) {
      return playerPoke;
    }

    const opponentPoke = this.state.opponentSide.pokemons.find((p) => p.id === id);

    if (opponentPoke) {
      return opponentPoke;
    }

    return null;
  }
}
