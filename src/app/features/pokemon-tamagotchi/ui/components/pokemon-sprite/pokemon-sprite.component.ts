import type { ElementRef } from '@angular/core';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  resolveSpriteUrl,
  resolveStatusSpriteKey,
} from '../../../data/helpers/sprite-variation.helper';
import type {
  InteractionEventModel,
  InteractionType,
} from '../../../data/models/interaction.model';
import type { PokemonModel } from '../../../data/models/pokemon.model';
import type { PokemonStatusModel } from '../../../data/models/pokemon-status.model';
import { AnimationService } from '../../services/animation.service';
import { GestureService } from '../../services/gesture.service';

@Component({
  selector: 'left-paw-pokemon-sprite',
  imports: [TranslocoDirective],
  providers: [GestureService],
  templateUrl: './pokemon-sprite.component.html',
  styleUrl: './pokemon-sprite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonSpriteComponent {
  private readonly animationService = inject(AnimationService);
  private readonly gestureService = inject(GestureService);
  private readonly spriteImage = viewChild<ElementRef<HTMLImageElement>>('spriteImage');
  private pointerHandledInteraction = false;

  public readonly interacted = output<InteractionEventModel>();
  public readonly isEvolving = input<boolean>(false);
  public readonly isSleeping = input<boolean>(false);
  public readonly isTraining = input<boolean>(false);
  public readonly pokemon = input.required<PokemonModel>();
  public readonly status = input.required<PokemonStatusModel>();

  protected readonly canInteract = computed(() => !this.isSleeping() && !this.isEvolving());
  protected readonly feedbackAnimation = signal<string | null>(null);
  protected readonly useComplexAnimations = computed(() =>
    this.animationService.shouldUseComplexAnimations(),
  );

  protected readonly spriteUrl = computed(() => {
    const species = this.pokemon();
    const statusKey = resolveStatusSpriteKey(this.isEvolving(), this.isSleeping(), this.status());

    return resolveSpriteUrl(species, statusKey);
  });

  protected readonly animationClass = computed(() => {
    const feedback = this.feedbackAnimation();

    if (feedback) {
      return feedback;
    }

    if (this.isEvolving()) {
      return 'pokemon-sprite__image--evolving';
    }

    if (this.isTraining()) {
      return 'pokemon-sprite__image--training';
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

  public constructor() {
    afterRenderEffect({
      write: (onCleanup) => {
        const image = this.spriteImage()?.nativeElement;

        if (!image) {
          return;
        }

        if (!this.useComplexAnimations()) {
          this.animationService.releaseGpuCompositing(image);

          return;
        }

        this.animationService.enableGpuCompositing(image);

        onCleanup(() => {
          this.animationService.releaseGpuCompositing(image);
        });
      },
    });
  }

  protected onClick(): void {
    if (this.pointerHandledInteraction) {
      this.pointerHandledInteraction = false;

      return;
    }

    this.applyGestureResult(this.gestureService.handleKeyboardActivate('click'));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.canInteract()) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const gestureType = this.resolveKeyboardGesture(event);

    if (!gestureType) {
      return;
    }

    event.preventDefault();
    this.applyGestureResult(this.gestureService.handleKeyboardActivate(gestureType));
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
    const result = this.gestureService.handlePointerUp(event);

    if (!this.canInteract() || !result) {
      return;
    }

    this.pointerHandledInteraction = true;
    this.applyGestureResult(result);
  }

  protected onPointerCancel(event: PointerEvent): void {
    this.gestureService.handlePointerCancel(event);
  }

  protected onFeedbackAnimationEnd(event: AnimationEvent): void {
    if (event.animationName !== this.feedbackAnimation()) {
      return;
    }

    this.feedbackAnimation.set(null);
  }

  private resolveKeyboardGesture(event: KeyboardEvent): InteractionType | null {
    if (event.ctrlKey || event.metaKey) {
      return 'multiTouch';
    }

    if (event.altKey) {
      return 'drag';
    }

    if (event.shiftKey) {
      return 'pet';
    }

    return null;
  }

  private applyGestureResult(result: {
    animationTrigger: string;
    event: InteractionEventModel;
  }): void {
    if (!this.canInteract()) {
      return;
    }

    this.triggerFeedbackAnimation(result.animationTrigger);
    this.interacted.emit(result.event);
  }

  private triggerFeedbackAnimation(animationClass: string): void {
    if (!this.useComplexAnimations()) {
      this.feedbackAnimation.set(null);

      return;
    }

    this.feedbackAnimation.set(animationClass);
  }
}
