import { Injectable } from '@angular/core';

import type { FloatingTone, OrphanFloat, OwnedFloat } from '../../models/floating-message';
import { createTransientId, TransientList } from './transient-list';

type StatusKind = 'evolved' | 'happy' | 'sad' | 'dying' | 'appeared' | 'died' | 'poke';

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
};

/**
 * The single source of floating scene texts. Multiple producers (eat, status transitions, detonation)
 * push here. `ownedMessages` belong to a live sprite (rendered inside its container); `orphanMessages`
 * are stamped at a vanished player's last-known spot. Each entry self-removes after its own `durationMs`.
 */
@Injectable()
export class FloatingMessagesStore {
  private readonly owned = new TransientList<OwnedFloat>();
  private readonly orphans = new TransientList<OrphanFloat>();

  public readonly ownedMessages = this.owned.items;
  public readonly orphanMessages = this.orphans.items;

  public pushOwned(entry: OwnedFloat): void {
    this.owned.add(entry, entry.durationMs);
  }

  public pushOrphan(entry: OrphanFloat): void {
    this.orphans.add(entry, entry.durationMs);
  }

  public remove(id: string): void {
    this.owned.remove(id);
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
    };
  }
}
