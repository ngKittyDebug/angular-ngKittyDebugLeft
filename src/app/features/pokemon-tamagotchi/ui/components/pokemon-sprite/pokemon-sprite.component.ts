import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { InteractionEvent, InteractionType } from '../../../models/interaction.model';
import type { Pokemon } from '../../../models/pokemon.model';
import type { PokemonStatus } from '../../../models/pokemon-status.model';

@Component({
  selector: 'left-paw-pokemon-sprite',
  imports: [],
  templateUrl: './pokemon-sprite.component.html',
  styleUrl: './pokemon-sprite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonSpriteComponent {
  private dragStart: { x: number; y: number } | null = null;

  public readonly interacted = output<InteractionEvent>();
  public readonly isEvolving = input<boolean>(false);
  public readonly isSleeping = input<boolean>(false);
  public readonly pokemon = input.required<Pokemon>();
  public readonly status = input.required<PokemonStatus>();

  protected readonly spriteUrl = computed(() => {
    const species = this.pokemon();

    if (this.isEvolving()) {
      return species.spriteUrls.evolving;
    }

    if (this.isSleeping()) {
      return species.spriteUrls.sleeping;
    }

    const current = this.status();

    if (current.mood >= 70) {
      return species.spriteUrls.happy;
    }

    if (current.mood <= 25 || current.hunger <= 25) {
      return species.spriteUrls.sad;
    }

    return species.spriteUrls.normal;
  });

  protected readonly animationClass = computed(() => {
    if (this.isEvolving()) {
      return 'pokemon-sprite__image--evolving';
    }

    if (this.isSleeping()) {
      return 'pokemon-sprite__image--sleeping';
    }

    const current = this.status();

    if (current.mood >= 70) {
      return 'pokemon-sprite__image--happy';
    }

    return 'pokemon-sprite__image--idle';
  });

  protected onClick(): void {
    this.emitInteraction('click', 0.5, 3);
  }

  protected onPointerDown(event: PointerEvent): void {
    this.dragStart = { x: event.clientX, y: event.clientY };
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    const deltaX = event.clientX - this.dragStart.x;
    const deltaY = event.clientY - this.dragStart.y;
    const distance = Math.hypot(deltaX, deltaY);

    this.dragStart = null;

    if (distance > 24) {
      const intensity = Math.min(1, distance / 120);

      this.emitInteraction('drag', intensity, Math.round(2 + intensity * 4));
    }
  }

  private emitInteraction(type: InteractionType, intensity: number, moodIncrease: number): void {
    if (this.isSleeping() || this.isEvolving()) {
      return;
    }

    this.interacted.emit({
      intensity,
      moodIncrease,
      timestamp: Date.now(),
      type,
    });
  }
}
