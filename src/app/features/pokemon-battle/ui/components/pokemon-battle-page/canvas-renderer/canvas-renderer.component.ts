import type { ElementRef, OnDestroy, OnInit } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  NgZone,
  viewChild,
} from '@angular/core';

import type { BattlePokemon, BattleState } from '@game/pokemon-battle/types';

@Component({
  selector: 'app-canvas-renderer',
  standalone: true,
  templateUrl: './canvas-renderer.component.html',
  styleUrl: './canvas-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasRendererComponent implements OnInit, OnDestroy {
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('battleCanvas');
  private readonly ngZone = inject(NgZone);
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private readonly imageCache = new Map<string, HTMLImageElement>();

  public readonly state = input.required<BattleState>();

  public ngOnInit(): void {
    const canvas = this.canvasRef()?.nativeElement;

    if (!canvas) {
      return;
    }

    // Set standard high resolution coordinates
    canvas.width = 800;
    canvas.height = 400;
    this.ctx = canvas.getContext('2d')!;

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
  }

  private render(timestamp: number): void {
    const context = this.ctx;
    const canvas = this.canvasRef()?.nativeElement;

    if (!canvas) {
      return;
    }

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background platform circles
    // Player side platform
    context.fillStyle = 'rgba(100, 180, 100, 0.6)';
    context.beginPath();
    context.ellipse(220, 320, 120, 30, 0, 0, 2 * Math.PI);
    context.fill();

    // Opponent side platform
    context.fillStyle = 'rgba(180, 100, 100, 0.6)';
    context.beginPath();
    context.ellipse(580, 200, 100, 25, 0, 0, 2 * Math.PI);
    context.fill();

    // Idle breathing animation based on timestamp
    const wave = Math.sin(timestamp * 0.003) * 4;

    // Render player active pokemons
    const playerSide = this.state().playerSide;

    playerSide.activePokemonIds.forEach((id, index) => {
      const pokemon = playerSide.pokemons.find((p) => p.id === id);

      if (!pokemon) {
        return;
      }

      // Layout coordinates
      const x = 220 - index * 60;
      const y = 280 + index * 30 + wave;

      this.drawPokemon(pokemon, x, y, 'back');
      this.drawUi(pokemon, x, y - 95);
    });

    // Render opponent active pokemons
    const opponentSide = this.state().opponentSide;

    opponentSide.activePokemonIds.forEach((id, index) => {
      const pokemon = opponentSide.pokemons.find((p) => p.id === id);

      if (!pokemon) {
        return;
      }

      const x = 580 + index * 50;
      const y = 160 - index * 25 - wave;

      this.drawPokemon(pokemon, x, y, 'front');
      this.drawUi(pokemon, x, y - 75);
    });
  }

  private drawPokemon(
    pokemon: BattlePokemon,
    x: number,
    y: number,
    spriteType: 'front' | 'back',
  ): void {
    const spriteUrl = spriteType === 'back' ? pokemon.sprites.back : pokemon.sprites.front;
    let img = this.imageCache.get(spriteUrl);

    if (!img) {
      img = new Image();
      img.src = spriteUrl;
      this.imageCache.set(spriteUrl, img);
    }

    if (img.complete && img.naturalWidth !== 0) {
      const width = 120;
      const height = 120;

      this.ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
    } else {
      // Loading state placeholder circle
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 30, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  private drawUi(pokemon: BattlePokemon, x: number, y: number): void {
    const context = this.ctx;

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
    context.fillStyle = '#ef4444';
    context.fillRect(barX, barY, barWidth, barHeight);

    // Green/Yellow fill for current HP
    const hpRatio = Math.max(0, Math.min(1, pokemon.hp / pokemon.maxHp));

    context.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.2 ? '#eab308' : '#ef4444';
    context.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // HP numerical text
    context.fillStyle = '#e2e8f0';
    context.font = '10px sans-serif';
    context.fillText(`${pokemon.hp}/${pokemon.maxHp}`, x, y + 17);
  }
}
