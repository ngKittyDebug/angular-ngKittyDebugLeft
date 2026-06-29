import type { ElementRef, OnDestroy, OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  NgZone,
  output,
  viewChild,
} from '@angular/core';

import type { BattleEvent, BattlePokemon, BattleState } from '@game/pokemon-battle/types';
import { AudioManagerService } from '../../../../data/services/audio-manager.service';

const CRY_STAGGER_MS = 400;
const MOVE_EVENT_DURATION_MS = 1000;
const DAMAGE_EVENT_DURATION_MS = 1000;
const FAINT_EVENT_DURATION_MS = 1000;
const DEFAULT_EVENT_DURATION_MS = 800;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

const PLATFORM_PLAYER_X = 220;
const PLATFORM_PLAYER_Y = 320;
const PLATFORM_OPPONENT_X = 580;
const PLATFORM_OPPONENT_Y = 200;

const BREATH_SPEED = 0.003;
const LUNGE_DISTANCE_PX = 40;

@Component({
  selector: 'left-paw-canvas-renderer',
  templateUrl: './canvas-renderer.component.html',
  styleUrl: './canvas-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasRendererComponent implements OnInit, OnDestroy {
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('battleCanvas');
  private readonly ngZone = inject(NgZone);
  private readonly audioManager = inject(AudioManagerService);
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private readonly imageCache = new Map<string, HTMLImageElement>();
  private readonly cryTimers: ReturnType<typeof setTimeout>[] = [];

  // Event queue and animation state
  private readonly eventQueue: BattleEvent[] = [];
  private currentEvent: BattleEvent | null = null;
  private eventStartTime = 0;
  private eventDuration = 0;
  private readonly animatedHps = new Map<number, number>();

  public readonly state = input.required<BattleState>();

  // Outputs for sequential event execution
  public readonly eventTriggered = output<BattleEvent>();
  public readonly animationFinished = output<void>();

  public ngOnInit(): void {
    const canvas = this.canvasRef()?.nativeElement;

    if (!canvas) {
      return;
    }

    // Set standard high resolution coordinates
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d')!;

    // Play initial cries at the start of battle
    this.playInitialCries();

    // Run the continuous rendering loop entirely outside Angular's Zone
    this.ngZone.runOutsideAngular(() => {
      const tick = (timestamp: number) => {
        this.render(timestamp);
        this.animationFrameId = requestAnimationFrame(tick);
      };

      this.animationFrameId = requestAnimationFrame(tick);
    });
  }

  public ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.cryTimers.forEach(clearTimeout);
  }

  public playEvents(events: BattleEvent[]): void {
    this.eventQueue.push(...events);
  }

  private playInitialCries(): void {
    const state = this.state();

    if (!state) {
      return;
    }

    const allActiveIds = [
      ...state.playerSide.activePokemonIds,
      ...state.opponentSide.activePokemonIds,
    ];

    this.ngZone.runOutsideAngular(() => {
      allActiveIds.forEach((id, index) => {
        const timerId = setTimeout(() => {
          this.audioManager.playCry(id);
        }, index * CRY_STAGGER_MS);

        this.cryTimers.push(timerId);
      });
    });
  }

  private updateAnimations(timestamp: number): void {
    // Process sequential animations in the queue
    if (!this.currentEvent && this.eventQueue.length > 0) {
      this.startNextEvent(timestamp);
    }

    if (this.currentEvent) {
      this.processCurrentEvent(timestamp);
    }
  }

  private startNextEvent(timestamp: number): void {
    const nextEvent = this.eventQueue.shift()!;

    this.currentEvent = nextEvent;
    this.eventStartTime = timestamp;

    // Assign duration based on event type
    if (nextEvent.type === 'use-move') {
      this.eventDuration = MOVE_EVENT_DURATION_MS;
    } else if (nextEvent.type === 'damage') {
      this.eventDuration = DAMAGE_EVENT_DURATION_MS;

      const targetId = nextEvent.payload?.targetId;

      if (targetId) {
        this.audioManager.playCry(targetId);
      }
    } else if (nextEvent.type === 'faint') {
      this.eventDuration = FAINT_EVENT_DURATION_MS;
    } else {
      this.eventDuration = DEFAULT_EVENT_DURATION_MS;
    }

    // Notify parent component within Angular's Zone to update text log
    this.ngZone.run(() => {
      this.eventTriggered.emit(nextEvent);
    });
  }

  private processCurrentEvent(timestamp: number): void {
    const elapsed = timestamp - this.eventStartTime;
    const currentEvent = this.currentEvent!;

    if (currentEvent.type === 'damage') {
      const payload = currentEvent.payload;

      if (payload && 'targetId' in payload) {
        const { targetId, hpBefore, hpAfter } = payload;

        if (targetId !== undefined && hpBefore !== undefined && hpAfter !== undefined) {
          const progress = Math.min(1, elapsed / this.eventDuration);
          const interpolatedHp = hpBefore + (hpAfter - hpBefore) * progress;

          this.animatedHps.set(targetId, interpolatedHp);
        }
      }
    }

    if (elapsed >= this.eventDuration) {
      // Enforce exact final HP at the end of damage animation
      if (currentEvent.type === 'damage') {
        const payload = currentEvent.payload;

        if (payload && 'targetId' in payload) {
          const { targetId, hpAfter } = payload;

          if (targetId !== undefined && hpAfter !== undefined) {
            this.animatedHps.set(targetId, hpAfter);
          }
        }
      }

      this.currentEvent = null;

      if (this.eventQueue.length === 0) {
        this.ngZone.run(() => {
          this.animationFinished.emit();
        });
      }
    }
  }

  private render(timestamp: number): void {
    const context = this.ctx;
    const canvas = this.canvasRef()?.nativeElement;

    if (!canvas) {
      return;
    }

    // Update animations state
    this.updateAnimations(timestamp);

    // Synchronize static HP values when no animations are running
    if (!this.currentEvent && this.eventQueue.length === 0) {
      const stateValue = this.state();

      stateValue.playerSide.pokemons.forEach((p) => {
        this.animatedHps.set(p.id, p.hp);
      });
      stateValue.opponentSide.pokemons.forEach((p) => {
        this.animatedHps.set(p.id, p.hp);
      });
    }

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background platform circles
    // Player side platform
    context.fillStyle = 'rgba(100, 180, 100, 0.6)';
    context.beginPath();
    context.ellipse(PLATFORM_PLAYER_X, PLATFORM_PLAYER_Y, 120, 30, 0, 0, 2 * Math.PI);
    context.fill();

    // Opponent side platform
    context.fillStyle = 'rgba(180, 100, 100, 0.6)';
    context.beginPath();
    context.ellipse(PLATFORM_OPPONENT_X, PLATFORM_OPPONENT_Y, 100, 25, 0, 0, 2 * Math.PI);
    context.fill();

    // Idle breathing animation based on timestamp
    const wave = Math.sin(timestamp * BREATH_SPEED) * 4;

    // Render player active pokemons
    const playerSide = this.state().playerSide;

    playerSide.activePokemonIds.forEach((id, index) => {
      const pokemon = playerSide.pokemons.find((p) => p.id === id);

      if (!pokemon) {
        return;
      }

      let offsetX = 0;
      let offsetY = 0;
      let alpha = 1.0;

      if (this.currentEvent) {
        const elapsed = timestamp - this.eventStartTime;
        const progress = Math.min(1, elapsed / this.eventDuration);

        if (
          this.currentEvent.type === 'use-move' &&
          this.currentEvent.payload?.attackerId === pokemon.id
        ) {
          const lungeDistribution = LUNGE_DISTANCE_PX;
          const factor = Math.sin(progress * Math.PI);

          offsetX = lungeDistribution * factor;
          offsetY = -lungeDistribution * 0.3 * factor;
        } else if (
          this.currentEvent.type === 'damage' &&
          this.currentEvent.payload?.targetId === pokemon.id
        ) {
          if (progress < 0.6) {
            offsetX = Math.sin(elapsed * 0.05) * 5;
          }
        } else if (
          this.currentEvent.type === 'faint' &&
          this.currentEvent.payload?.pokemonId === pokemon.id
        ) {
          offsetY = progress * 50;
          alpha = 1.0 - progress;
        }
      }

      // Base layout coordinates
      const uiX = PLATFORM_PLAYER_X - index * 60;
      const uiY = PLATFORM_PLAYER_Y - 40 + index * 30 + wave;

      this.drawPokemon(pokemon, uiX + offsetX, uiY + offsetY, 'back', alpha);

      if (alpha > 0) {
        this.drawUi(pokemon, uiX, uiY - 95, alpha);
      }
    });

    // Render opponent active pokemons
    const opponentSide = this.state().opponentSide;

    opponentSide.activePokemonIds.forEach((id, index) => {
      const pokemon = opponentSide.pokemons.find((p) => p.id === id);

      if (!pokemon) {
        return;
      }

      let offsetX = 0;
      let offsetY = 0;
      let alpha = 1.0;

      if (this.currentEvent) {
        const elapsed = timestamp - this.eventStartTime;
        const progress = Math.min(1, elapsed / this.eventDuration);

        if (
          this.currentEvent.type === 'use-move' &&
          this.currentEvent.payload?.attackerId === pokemon.id
        ) {
          const lungeDistribution = -LUNGE_DISTANCE_PX; // Lunge left
          const factor = Math.sin(progress * Math.PI);

          offsetX = lungeDistribution * factor;
          offsetY = -lungeDistribution * 0.3 * factor;
        } else if (
          this.currentEvent.type === 'damage' &&
          this.currentEvent.payload?.targetId === pokemon.id
        ) {
          if (progress < 0.6) {
            offsetX = Math.sin(elapsed * 0.05) * 5;
          }
        } else if (
          this.currentEvent.type === 'faint' &&
          this.currentEvent.payload?.pokemonId === pokemon.id
        ) {
          offsetY = progress * 50;
          alpha = 1.0 - progress;
        }
      }

      // Base layout coordinates
      const uiX = PLATFORM_OPPONENT_X + index * 50;
      const uiY = PLATFORM_OPPONENT_Y - 40 - index * 25 - wave;

      this.drawPokemon(pokemon, uiX + offsetX, uiY + offsetY, 'front', alpha);

      if (alpha > 0) {
        this.drawUi(pokemon, uiX, uiY - 75, alpha);
      }
    });
  }

  private drawPokemon(
    pokemon: BattlePokemon,
    x: number,
    y: number,
    spriteType: 'front' | 'back',
    alpha = 1.0,
  ): void {
    const spriteUrl = spriteType === 'back' ? pokemon.sprites.back : pokemon.sprites.front;
    let img = this.imageCache.get(spriteUrl);

    if (!img) {
      img = new Image();
      img.src = spriteUrl;
      this.imageCache.set(spriteUrl, img);
    }

    const context = this.ctx;
    const oldAlpha = context.globalAlpha;

    context.globalAlpha = alpha;

    if (img.complete && img.naturalWidth !== 0) {
      const width = 120;
      const height = 120;

      context.drawImage(img, x - width / 2, y - height / 2, width, height);
    } else {
      // Loading state placeholder circle
      context.fillStyle = '#cbd5e1';
      context.beginPath();
      context.arc(x, y, 30, 0, 2 * Math.PI);
      context.fill();
    }

    context.globalAlpha = oldAlpha;
  }

  private drawUi(pokemon: BattlePokemon, x: number, y: number, alpha = 1.0): void {
    const context = this.ctx;
    const oldAlpha = context.globalAlpha;

    context.globalAlpha = alpha;

    const animatedHp = this.animatedHps.get(pokemon.id) ?? pokemon.hp;

    // Frame background for HP & name plate
    context.fillStyle = 'rgba(15, 23, 42, 0.75)';
    context.beginPath();
    context.roundRect(x - 65, y - 25, 130, 48, 6);
    context.fill();

    // Draw Pokemon name
    context.fillStyle = '#ffffff';
    context.font = 'bold 11px sans-serif';
    context.textAlign = 'center';
    context.fillText(pokemon.name.toUpperCase(), x, y - 10);

    // HP Bar bounding box dimensions
    const barWidth = 100;
    const barHeight = 6;
    const barX = x - 50;
    const barY = y + 2;

    // Red background for HP loss
    context.fillStyle = `rgba(239, 68, 68, ${alpha})`;
    context.fillRect(barX, barY, barWidth, barHeight);

    // Green/Yellow fill for current HP
    const hpRatio = Math.max(0, Math.min(1, animatedHp / pokemon.maxHp));

    context.fillStyle =
      hpRatio > 0.5
        ? `rgba(34, 197, 94, ${alpha})`
        : hpRatio > 0.2
          ? `rgba(234, 179, 8, ${alpha})`
          : `rgba(239, 68, 68, ${alpha})`;
    context.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // HP numerical text
    context.fillStyle = `rgba(226, 232, 240, ${alpha})`;
    context.font = '10px sans-serif';
    context.fillText(`${Math.round(animatedHp)}/${pokemon.maxHp}`, x, y + 17);

    context.globalAlpha = oldAlpha;
  }
}
