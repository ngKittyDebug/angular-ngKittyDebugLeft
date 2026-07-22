import { Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { EFFECT_BADGE } from '../../models/effect-badge';
import type { FloatingTone, OrphanFloat, OwnedFloat } from '../../models/floating-message';
import { OwnerReleaseQueue } from './owner-release-queue';
import { createTransientId, TransientList } from './transient-list';

type StatusKind =
  | 'evolved'
  | 'happy'
  | 'sad'
  | 'dying'
  | 'appeared'
  | 'died'
  | 'poke'
  | 'shield'
  | 'wellFed'
  | 'laying'
  | 'pooping'
  | 'cactus'
  | 'npcAppeared'
  | 'npcPoke'
  | 'npcDied';

interface StatusConfig {
  tone: FloatingTone;
  icon: string;
  durationMs: number;
  phraseCount: number;
}

interface StatusBase {
  id: string;
  tone: FloatingTone;
  textKey: string;
  durationMs: number;
  icon: string;
  priority: number;
}

// Status floats rise and fade like eat texts, but live longer so they can be read.
const STATUS_CONFIG: Record<StatusKind, StatusConfig> = {
  evolved: { tone: 'positive', icon: '@tui.sparkles', durationMs: 2500, phraseCount: 4 },
  happy: { tone: 'positive', icon: '@tui.smile', durationMs: 2500, phraseCount: 4 },
  sad: { tone: 'neutral', icon: '@tui.frown', durationMs: 2500, phraseCount: 4 },
  dying: { tone: 'warning', icon: '@tui.triangle-alert', durationMs: 4000, phraseCount: 10 },
  appeared: { tone: 'positive', icon: '@tui.user-plus', durationMs: 2500, phraseCount: 4 },
  died: { tone: 'neutral', icon: '@tui.skull', durationMs: 5500, phraseCount: 4 },
  poke: { tone: 'neutral', icon: '@tui.laugh', durationMs: 1400, phraseCount: 12 },
  // icon + tone derive from the shared EFFECT_BADGE registry (single source); only the float timing/phrase count
  // are local. Keeps the over-head badges, the status-card strip and these quips on one palette.
  shield: { ...EFFECT_BADGE.shield, durationMs: 2500, phraseCount: 4 },
  wellFed: { ...EFFECT_BADGE.wellFed, durationMs: 2500, phraseCount: 4 },
  laying: { ...EFFECT_BADGE.laying, durationMs: 2500, phraseCount: 4 },
  pooping: { ...EFFECT_BADGE.pooping, durationMs: 2500, phraseCount: 4 },
  cactus: { ...EFFECT_BADGE.cactus, durationMs: 2500, phraseCount: 4 },
  npcAppeared: { tone: 'warning', icon: '@tui.bomb', durationMs: 2500, phraseCount: 4 },
  npcPoke: { tone: 'negative', icon: '@tui.flame', durationMs: 1400, phraseCount: 10 },
  npcDied: { tone: 'negative', icon: '@tui.bomb', durationMs: 5500, phraseCount: 4 },
};

/**
 * The single source of floating scene texts. Multiple producers (eat, status transitions, detonation)
 * push here. `ownedMessageList` belong to a live sprite (rendered inside its container); `orphanMessageList`
 * are stamped at a vanished player's last-known spot. Each entry self-removes after its own `durationMs`.
 */
@Injectable()
export class FloatingMessagesStore {
  private readonly owned = new TransientList<OwnedFloat>();
  private readonly orphans = new TransientList<OrphanFloat>();
  // Owned floats queue per owner and release one at a time into the visible list, so a flurry chases up a
  // single column instead of overlapping at the head.
  private readonly queue = new OwnerReleaseQueue<OwnedFloat>((float) =>
    this.owned.add(float, float.durationMs),
  );

  public readonly ownedMessageList = this.owned.items;
  public readonly orphanMessageList = this.orphans.items;

  public pushOwned(entry: OwnedFloat): void {
    this.queue.enqueue(entry);
  }

  public pushOrphan(entry: OrphanFloat): void {
    this.orphans.add(entry, entry.durationMs);
  }

  public remove(id: string): void {
    // A live quip's id may still be pending (not yet released) — drop it there first; only if it already
    // surfaced do we pull it from the visible list. Keeps dying-clear / poke-replace correct in both states.
    if (this.queue.removePending(id)) {
      return;
    }

    const removed = this.owned.items().find((float) => float.id === id);

    this.owned.remove(id);

    // Removing a released float frees its column slot — let any pending replacement surface at once.
    if (removed !== undefined) {
      this.queue.notifyRemoved(removed.ownerId);
    }
  }

  // Status quip anchored to a live sprite. Returns the id so callers that own a single live quip
  // (dying, poke) can replace or clear it.
  public pushOwnedStatus(kind: StatusKind, ownerId: string, who?: string): string {
    const entry: OwnedFloat = { ...this.statusBase(kind), ownerId, who };

    this.pushOwned(entry);

    return entry.id;
  }

  // Death quip for a player already gone — stamped at its last-known scene position.
  public pushOrphanStatus(kind: StatusKind, x: number, y: number, who?: string): void {
    this.pushOrphan({ ...this.statusBase(kind), x, y, who });
  }

  private statusBase(kind: StatusKind): StatusBase {
    const config = STATUS_CONFIG[kind];
    const index = Math.floor(Math.random() * config.phraseCount);

    return {
      id: createTransientId(),
      tone: config.tone,
      textKey: `statusMessage.${kind}.${index}`,
      durationMs: config.durationMs,
      icon: config.icon,
      priority: FRENZY.floatPriority[kind],
    };
  }
}
