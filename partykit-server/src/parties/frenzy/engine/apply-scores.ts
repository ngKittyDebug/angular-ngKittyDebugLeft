import type { FaintedEvent, Player } from '@game/frenzy/types';

interface KillTally {
  kills: number;
  crownKills: number;
}

/**
 * Credit attributed kills to the survivors that dealt them. For each fainted event naming a `killerId`, the killer
 * (if still alive in `players`) gains `+1 kills`; if the victim was the crown (`crownId`), also `+1 crownKills` —
 * the bounty bonus weighted extra in `totalScore`. Faints with no killer (decay, ownerless items) credit nobody,
 * and a killer who died the same tick is absent from `players`, so that credit is silently dropped. Pure.
 */
export function applyKills(
  players: readonly Player[],
  faints: readonly FaintedEvent[],
  crownId: string | null,
): Player[] {
  const tally = new Map<string, KillTally>();

  for (const faint of faints) {
    const { cause } = faint;
    const killerId = cause !== undefined && cause.by !== 'decay' ? cause.killerId : undefined;

    if (killerId === undefined) {
      continue;
    }

    const credit = tally.get(killerId) ?? { kills: 0, crownKills: 0 };

    credit.kills += 1;

    if (faint.playerId === crownId) {
      credit.crownKills += 1;
    }

    tally.set(killerId, credit);
  }

  return players.map((player) => {
    const credit = tally.get(player.id);

    if (credit === undefined) {
      return player;
    }

    return {
      ...player,
      scores: {
        ...player.scores,
        kills: (player.scores.kills ?? 0) + credit.kills,
        crownKills: (player.scores.crownKills ?? 0) + credit.crownKills,
      },
    };
  });
}

/**
 * Materialize `timeAlive` (whole seconds since `joinedAt`) into each player's `scores` for the snapshot projection.
 * The client lacks the server clock to derive it, so the server stamps it on the way out. Lives here with the other
 * score logic (not in the transport adapter) so the formula is unit-tested. Returns new objects; never mutates.
 */
export function projectTimeAlive(players: readonly Player[], now: number): Player[] {
  return players.map((player) => ({
    ...player,
    scores: { ...player.scores, timeAlive: Math.floor((now - player.joinedAt) / 1000) },
  }));
}
