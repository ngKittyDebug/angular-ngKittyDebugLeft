import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { MINI_GAME_CONFIGS } from '../../../data/constants/mini-game.constants';
import {
  createReflexTarget,
  estimateReflexMaxScore,
  isHitTarget,
  type ReflexTarget,
} from '../../../data/helpers/mini-game-logic.helper';
import type { GameResult, MiniGameType } from '../../../models/mini-game.model';

const SPAWN_INTERVAL_MS = 900;
const TARGET_LIFETIME_MS = 1_400;

@Component({
  selector: 'left-paw-mini-game',
  imports: [TranslocoDirective, TuiButton],
  templateUrl: './mini-game.component.html',
  styleUrl: './mini-game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniGameComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private animationFrame = 0;
  private context: CanvasRenderingContext2D | null = null;
  private ended = false;
  private nextSpawnAt = 0;
  private nextTargetId = 1;
  private startedAt = 0;
  private targets: ReflexTarget[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  public readonly gameCompleted = output<GameResult>();
  public readonly gameType = input.required<MiniGameType>();

  protected score = 0;
  protected secondsLeft = 0;

  public ngAfterViewInit(): void {
    const config = MINI_GAME_CONFIGS[this.gameType()];

    this.secondsLeft = config.duration;
    this.startedAt = Date.now();
    this.nextSpawnAt = this.startedAt + 300;
    this.resizeCanvas();
    this.context = this.canvasRef().nativeElement.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    this.tickTimer = setInterval(() => this.onTick(), 250);
    this.animationFrame = requestAnimationFrame(() => this.gameLoop());
  }

  public ngOnDestroy(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }

    cancelAnimationFrame(this.animationFrame);
  }

  protected onCanvasClick(event: MouseEvent): void {
    if (this.ended) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const hitIndex = this.targets.findIndex((target) => isHitTarget(target, x, y));

    if (hitIndex >= 0) {
      this.targets.splice(hitIndex, 1);
      this.score += 1;
    }
  }

  protected finishEarly(): void {
    this.endGame();
  }

  private onTick(): void {
    if (this.ended) {
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const config = MINI_GAME_CONFIGS[this.gameType()];
    const remaining = Math.max(0, config.duration - elapsedSeconds);

    this.secondsLeft = remaining;

    if (remaining <= 0) {
      this.endGame();
    }
  }

  private gameLoop(): void {
    if (this.ended) {
      return;
    }

    const now = Date.now();

    if (now >= this.nextSpawnAt) {
      const canvas = this.canvasRef().nativeElement;

      this.targets.push(createReflexTarget(this.nextTargetId++, canvas.width, canvas.height, now));
      this.nextSpawnAt = now + SPAWN_INTERVAL_MS;
    }

    this.targets = this.targets.filter((target) => now - target.createdAt < TARGET_LIFETIME_MS);

    this.draw();
    this.animationFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private draw(): void {
    const context = this.context;

    if (!context) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const target of this.targets) {
      context.beginPath();
      context.fillStyle = '#4bb4e6';
      context.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
    }
  }

  private endGame(): void {
    if (this.ended) {
      return;
    }

    this.ended = true;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    cancelAnimationFrame(this.animationFrame);

    const config = MINI_GAME_CONFIGS[this.gameType()];
    const maxScore = estimateReflexMaxScore(config.duration, SPAWN_INTERVAL_MS);
    const timeTaken = Date.now() - this.startedAt;
    const performance = maxScore > 0 ? Math.min(1, this.score / maxScore) : 0;

    this.gameCompleted.emit({
      experienceEarned: 0,
      gameType: this.gameType(),
      maxScore,
      performance,
      score: this.score,
      timeTaken,
    });
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef().nativeElement;

    canvas.width = 480;
    canvas.height = 320;
  }
}
