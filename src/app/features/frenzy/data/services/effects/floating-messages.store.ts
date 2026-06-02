import { Injectable } from '@angular/core';

import type { FloatingMessage, FloatingTone } from '../../models/floating-message';
import { createTransientId, TransientList } from './transient-list';

type StatusKind = 'evolved' | 'happy' | 'sad' | 'dying' | 'appeared' | 'died' | 'poke';

interface StatusConfig {
  tone: FloatingTone;
  icon: string;
  durationMs: number;
  phraseCount: number;
}

// Lift status floats to the sprite's top edge: player `y` is the sprite centre, sprite is 96px tall,
// so half (48px) reaches the top border + a small gap so the text clears the head.
const STATUS_SPRITE_TOP_OFFSET_PX = 60;

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
 * push here; the scene renders `messages`. Each entry self-removes after its own `durationMs`.
 */
@Injectable()
export class FloatingMessagesStore {
  private readonly list = new TransientList<FloatingMessage>();

  public readonly messages = this.list.items;

  public push(entry: FloatingMessage): void {
    this.list.add(entry, entry.durationMs);
  }

  public remove(id: string): void {
    this.list.remove(id);
  }

  // A short status quip (eat-independent) anchored above a sprite. Returns the id so callers that
  // own a single live quip (dying, poke) can replace or clear it.
  public pushStatus(kind: StatusKind, x: number, y: number, who?: string): string {
    const config = STATUS_CONFIG[kind];
    const index = Math.floor(Math.random() * config.phraseCount);
    const entry: FloatingMessage = {
      id: createTransientId(),
      x,
      y,
      tone: config.tone,
      textKey: `statusMessage.${kind}.${index}`,
      durationMs: config.durationMs,
      icon: config.icon,
      who,
      topOffsetPx: STATUS_SPRITE_TOP_OFFSET_PX,
    };

    this.push(entry);

    return entry.id;
  }
}
