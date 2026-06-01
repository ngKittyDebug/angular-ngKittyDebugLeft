import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GAME } from '@game/frenzy/constants';
import type { Player, ServerMessage } from '@game/frenzy/types';

import { isSad } from '../logic/is-sad';
import type { Blast } from '../models/blast';
import type { FloatingMessage, FloatingTone } from '../models/floating-message';
import { FrenzyStore } from '../store/frenzy.store';
import { FrenzySocketService } from './frenzy-socket.service';
import { BadEatSoundService } from './sound/bad-eat-sound.service';
import { EatSoundService } from './sound/eat-sound.service';
import { EvolveSoundService } from './sound/evolve-sound.service';
import { ExplosionSoundService } from './sound/explosion-sound.service';
import { RockSoundService } from './sound/rock-sound.service';
import { SoundSettingsService } from './sound/sound-settings.service';
import { type SoundEffect } from '../models/sound-effect';

type EatenMessage = Extract<ServerMessage, { type: 'eaten' }>;
type DetonatedMessage = Extract<ServerMessage, { type: 'detonated' }>;
type StatusKind = 'evolved' | 'happy' | 'sad' | 'dying' | 'appeared' | 'died' | 'poke';

interface StatusConfig {
  tone: FloatingTone;
  icon: string;
  durationMs: number;
  phraseCount: number;
}

const EVOLUTION_ANIMATION_MS = 1500;
const FLOATING_TEXT_TTL_MS = 1000;
const FLOATING_TEXT_PHRASE_COUNT = 5;
// Shockwave ring lifetime — matches the scene's blast CSS animation.
const BLAST_TTL_MS = 700;
// Bomb damage floats linger a touch longer than eat floats so the "−25" hit reads amid the explosion.
const BOMB_FLOAT_TTL_MS = 1400;
// Lift status floats to the sprite's top edge: player `y` is the sprite centre, sprite is 96px tall,
// so half (48px) reaches the top border + a small gap so the text clears the head.
const STATUS_SPRITE_TOP_OFFSET_PX = 60;
// Eat floats start above the clicked item, not over it: must exceed the item button's full height
// (60px sprite + 12px padding ≈ 84px) plus a gap, since the float is then centred on this `top`.
const EAT_FLOAT_TOP_OFFSET_PX = 90;
// Safety TTL for a remembered click position if no `eaten` ever arrives (rate-limited, lost race).
const EAT_POSITION_TTL_MS = 2000;

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

@Injectable()
export class FrenzyEffectsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly badEatSound = inject(BadEatSoundService);
  private readonly eatSound = inject(EatSoundService);
  private readonly evolveSound = inject(EvolveSoundService);
  private readonly explosionSound = inject(ExplosionSoundService);
  private readonly rockSound = inject(RockSoundService);
  private readonly soundSettings = inject(SoundSettingsService);
  private readonly socket = inject(FrenzySocketService);
  private readonly store = inject(FrenzyStore);
  private readonly _evolvingPlayers = signal<ReadonlyMap<string, number>>(new Map());
  private readonly _floatingMessages = signal<readonly FloatingMessage[]>([]);
  private readonly _blasts = signal<readonly Blast[]>([]);
  private readonly lastKnownPlayers = new Map<string, { x: number; y: number; name: string }>();
  // Item on-screen position captured at click time, keyed by itemId, consumed by the matching `eaten`.
  private readonly eatPositions = new Map<string, { x: number; y: number }>();
  private knownPlayerIds = new Set<string>();
  private seenFirstSnapshot = false;
  private dyingMessageId: string | null = null;
  private pokeMessageId: string | null = null;

  public readonly evolvingPlayers = this._evolvingPlayers.asReadonly();
  public readonly floatingMessages = this._floatingMessages.asReadonly();
  public readonly blasts = this._blasts.asReadonly();

  public constructor() {
    this.socket.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      if (message.type === 'snapshot') {
        this.handleSnapshot(message.state.players);
      }

      if (message.type === 'fainted') {
        this.handleFainted(message.playerId);
      }

      if (message.type === 'evolved') {
        this.markEvolving(message.playerId);

        if (this.isMine(message.playerId)) {
          this.playSound(this.evolveSound);

          const me = this.store.me();

          if (me !== null) {
            this.pushStatus('evolved', me.x, me.y);
          }
        }
      }

      if (message.type === 'eaten') {
        this.pushFloatingText(message);

        if (this.isMine(message.playerId)) {
          this.playSound(this.eatenSoundFor(message));
        }
      }

      if (message.type === 'detonated') {
        this.pushDetonation(message);
      }
    });

    let wasSad = false;
    let wasDying = false;

    effect(() => {
      const me = this.store.me();
      const alive = me !== null && me.mass > 0;
      const dyingNow = alive && me.mass <= GAME.lowMassWarningThreshold;
      const sadNow = alive && !dyingNow && isSad(me.mass, me.stage);

      if (me !== null && sadNow && !wasSad) {
        this.pushStatus('sad', me.x, me.y);
      }

      if (me !== null && alive && !dyingNow && !sadNow && wasSad) {
        this.pushStatus('happy', me.x, me.y);
      }

      if (me !== null && dyingNow && !wasDying) {
        this.dyingMessageId = this.pushStatus('dying', me.x, me.y);
      } else if (!dyingNow && wasDying && this.dyingMessageId !== null) {
        this.remove(this.dyingMessageId);
        this.dyingMessageId = null;
      }

      wasSad = sadNow;
      wasDying = dyingNow;
    });
  }

  // Client-only easter egg: clicking your own Pokémon makes it quip (Warcraft peasant style).
  // Each click replaces the previous quip so rapid clicks interrupt rather than pile up.
  public pokeSelf(): void {
    const me = this.store.me();

    if (me === null) {
      return;
    }

    if (this.pokeMessageId !== null) {
      this.remove(this.pokeMessageId);
    }

    this.pokeMessageId = this.pushStatus('poke', me.x, me.y);
  }

  // Called on click with the item's on-screen position; the matching `eaten` anchors its float here.
  public rememberEatPosition(itemId: string, x: number, y: number): void {
    this.eatPositions.set(itemId, { x, y });
    setTimeout(() => this.eatPositions.delete(itemId), EAT_POSITION_TTL_MS);
  }

  private isMine(playerId: string): boolean {
    return playerId === this.store.myId();
  }

  private eatenSoundFor(message: EatenMessage): SoundEffect {
    // A rock always thunks — whether clicked (delta 0) or it bonked the Pokémon on collision (delta < 0).
    if (message.itemType === 'rock') {
      return this.rockSound;
    }

    return message.delta < 0 ? this.badEatSound : this.eatSound;
  }

  private toneForDelta(delta: number): FloatingTone {
    if (delta > 0) {
      return 'positive';
    }

    if (delta < 0) {
      return 'negative';
    }

    return 'neutral';
  }

  private playSound(source: SoundEffect): void {
    if (this.soundSettings.enabled()) {
      source.play();
    }
  }

  private handleSnapshot(players: readonly Player[]): void {
    const myId = this.store.myId();
    const currentIds = new Set<string>();

    for (const player of players) {
      currentIds.add(player.id);
      this.lastKnownPlayers.set(player.id, { x: player.x, y: player.y, name: player.name });

      if (this.seenFirstSnapshot && player.id !== myId && !this.knownPlayerIds.has(player.id)) {
        this.pushStatus('appeared', player.x, player.y, player.name);
      }
    }

    for (const id of [...this.lastKnownPlayers.keys()]) {
      if (!currentIds.has(id)) {
        this.lastKnownPlayers.delete(id);
      }
    }

    this.knownPlayerIds = currentIds;
    this.seenFirstSnapshot = true;
  }

  private handleFainted(playerId: string): void {
    if (this.isMine(playerId)) {
      return;
    }

    const last = this.lastKnownPlayers.get(playerId);

    if (last === undefined) {
      return;
    }

    this.pushStatus('died', last.x, last.y, last.name);
    this.lastKnownPlayers.delete(playerId);
    this.knownPlayerIds.delete(playerId);
  }

  private markEvolving(playerId: string): void {
    this._evolvingPlayers.update((current) => {
      const next = new Map(current);

      next.set(playerId, Date.now());

      return next;
    });
    setTimeout(() => {
      this._evolvingPlayers.update((current) => {
        if (!current.has(playerId)) {
          return current;
        }

        const next = new Map(current);

        next.delete(playerId);

        return next;
      });
    }, EVOLUTION_ANIMATION_MS);
  }

  private pushStatus(kind: StatusKind, x: number, y: number, who?: string): string {
    const config = STATUS_CONFIG[kind];
    const index = Math.floor(Math.random() * config.phraseCount);
    const entry: FloatingMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x,
      y,
      tone: config.tone,
      textKey: `statusMessage.${kind}.${index}`,
      durationMs: config.durationMs,
      icon: config.icon,
      who,
      topOffsetPx: STATUS_SPRITE_TOP_OFFSET_PX,
    };

    this._floatingMessages.update((current) => [...current, entry]);
    setTimeout(() => this.remove(entry.id), config.durationMs);

    return entry.id;
  }

  private pushFloatingText(message: EatenMessage): void {
    const player = this.store
      .state()
      ?.players.find((candidate) => candidate.id === message.playerId);
    const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
    // Prefer the item's on-screen position captured at click time — it matches what the player saw
    // under the cursor (the server event coords lag the client's smoothed render and, with resting
    // items, jump to the floor). Fall back to the event coords for eats this client didn't initiate.
    const clickPosition = this.eatPositions.get(message.itemId);

    this.eatPositions.delete(message.itemId);

    const entry: FloatingMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x: clickPosition?.x ?? message.x,
      y: clickPosition?.y ?? message.y,
      topOffsetPx: EAT_FLOAT_TOP_OFFSET_PX,
      tone: this.toneForDelta(message.delta),
      textKey: `floatingText.${message.itemType}.${index}`,
      durationMs: FLOATING_TEXT_TTL_MS,
      // My own eats don't need a name — it's obvious it's me; names help only on others' floats.
      who: this.isMine(message.playerId) ? undefined : player?.name,
      delta: message.delta,
    };

    this._floatingMessages.update((current) => [...current, entry]);
    setTimeout(() => this.remove(entry.id), FLOATING_TEXT_TTL_MS);
  }

  // A bomb exploded: boom for everyone, a shockwave ring at the blast point, and a "−25" float over each hit Pokémon.
  private pushDetonation(message: DetonatedMessage): void {
    this.playSound(this.explosionSound);

    const blast: Blast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x: message.x,
      y: message.y,
      radius: message.radius,
    };

    this._blasts.update((current) => [...current, blast]);
    setTimeout(() => this.removeBlast(blast.id), BLAST_TTL_MS);

    for (const playerId of message.playerIds) {
      const position = this.positionOf(playerId);

      if (position === undefined) {
        continue;
      }

      const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
      const entry: FloatingMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x: position.x,
        y: position.y,
        tone: 'negative',
        textKey: `floatingText.bomb.${index}`,
        durationMs: BOMB_FLOAT_TTL_MS,
        icon: '@tui.bomb',
        delta: GAME.bomb.damage,
        topOffsetPx: STATUS_SPRITE_TOP_OFFSET_PX,
      };

      this._floatingMessages.update((current) => [...current, entry]);
      setTimeout(() => this.remove(entry.id), BOMB_FLOAT_TTL_MS);
    }
  }

  // Live snapshot position if the Pokémon is still around, else its last-known spot (it may have just fainted).
  private positionOf(playerId: string): { x: number; y: number } | undefined {
    const player = this.store.state()?.players.find((candidate) => candidate.id === playerId);

    if (player !== undefined) {
      return { x: player.x, y: player.y };
    }

    return this.lastKnownPlayers.get(playerId);
  }

  private removeBlast(id: string): void {
    this._blasts.update((current) => current.filter((blast) => blast.id !== id));
  }

  private remove(id: string): void {
    this._floatingMessages.update((current) => current.filter((item) => item.id !== id));
  }
}
