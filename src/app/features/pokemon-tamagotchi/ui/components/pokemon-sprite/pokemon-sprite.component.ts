import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { InteractionEvent } from '../../../models/interaction.model';
import type { Pokemon } from '../../../models/pokemon.model';
import type { PokemonStatus } from '../../../models/pokemon-status.model';
import { GestureService } from '../../services/gesture.service';

const FEEDBACK_ANIMATION_MS = 650;

@Component({
  selector: 'left-paw-pokemon-sprite',
  imports: [],
  providers: [GestureService],
  templateUrl: './pokemon-sprite.component.html',
  styleUrl: './pokemon-sprite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonSpriteComponent {
  private readonly gestureService = inject(GestureService);
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pointerHandledInteraction = false;

  public readonly interacted = output<InteractionEvent>();
  public readonly isEvolving = input<boolean>(false);
  public readonly isSleeping = input<boolean>(false);
  public readonly pokemon = input.required<Pokemon>();
  public readonly status = input.required<PokemonStatus>();

  protected readonly feedbackAnimation = signal<string | null>(null);

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
    const feedback = this.feedbackAnimation();

    if (feedback) {
      return feedback;
    }

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
    if (this.pointerHandledInteraction) {
      this.pointerHandledInteraction = false;

      return;
    }

    this.applyGestureResult(this.gestureService.handleKeyboardActivate());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.canInteract()) {
      return;
    }

    const result = this.gestureService.handlePointerDown(event);

    if (result) {
      this.applyGestureResult(result);
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.canInteract()) {
      return;
    }

    this.gestureService.handlePointerMove(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.canInteract()) {
      return;
    }

    const result = this.gestureService.handlePointerUp(event);

    if (result) {
      this.pointerHandledInteraction = true;
      this.applyGestureResult(result);
    }
  }

  protected onPointerCancel(event: PointerEvent): void {
    this.gestureService.handlePointerCancel(event);
  }

  private canInteract(): boolean {
    return !this.isSleeping() && !this.isEvolving();
  }

  private applyGestureResult(result: { animationTrigger: string; event: InteractionEvent }): void {
    if (!this.canInteract()) {
      return;
    }

    this.triggerFeedbackAnimation(result.animationTrigger);
    this.interacted.emit(result.event);
  }

  private triggerFeedbackAnimation(animationClass: string): void {
    this.feedbackAnimation.set(animationClass);

    if (this.feedbackTimeoutId !== null) {
      clearTimeout(this.feedbackTimeoutId);
    }

    this.feedbackTimeoutId = setTimeout(() => {
      this.feedbackAnimation.set(null);
      this.feedbackTimeoutId = null;
    }, FEEDBACK_ANIMATION_MS);
  }
}
