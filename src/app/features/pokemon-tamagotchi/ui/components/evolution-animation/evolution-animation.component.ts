import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  EVOLUTION_ANIMATION_DURATION_MS,
  EVOLUTION_REDUCED_ANIMATION_DURATION_MS,
  EVOLUTION_REVEAL_DURATION_MS,
} from '../../../data/constants/evolution-criteria.constants';
import type { PokemonModel } from '../../../data/models/pokemon.model';
import { AnimationService } from '../../services/animation.service';

type EvolutionPhase = 'flash' | 'reveal' | 'start';

@Component({
  selector: 'left-paw-evolution-animation',
  imports: [TranslocoDirective],
  templateUrl: './evolution-animation.component.html',
  styleUrl: './evolution-animation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvolutionAnimationComponent {
  private readonly animationService = inject(AnimationService);
  private readonly destroyRef = inject(DestroyRef);
  private swapTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private revealTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private completeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  public readonly active = input<boolean>(false);
  public readonly fromPokemon = input.required<PokemonModel>();
  public readonly toPokemon = input<PokemonModel | null>(null);

  public readonly animationComplete = output<PokemonModel>();

  protected readonly visible = signal(false);
  protected readonly phase = signal<EvolutionPhase>('start');
  protected readonly displaySprite = signal('');
  protected readonly useComplexAnimations = computed(() =>
    this.animationService.shouldUseComplexAnimations(),
  );

  public constructor() {
    effect(() => {
      const isActive = this.active();
      const target = this.toPokemon();
      const source = this.fromPokemon();
      const useComplex = this.useComplexAnimations();

      this.clearTimers();

      if (!isActive || !target) {
        this.visible.set(false);

        return;
      }

      this.visible.set(true);
      this.phase.set('start');
      this.displaySprite.set(source.spriteUrls.evolving || source.spriteUrls.normal);

      if (!useComplex) {
        this.phase.set('reveal');
        this.displaySprite.set(target.spriteUrls.normal);
        this.completeTimeoutId = setTimeout(() => {
          this.visible.set(false);
          this.animationComplete.emit(target);
        }, EVOLUTION_REDUCED_ANIMATION_DURATION_MS);

        return;
      }

      const halfDuration = EVOLUTION_ANIMATION_DURATION_MS / 2;

      this.swapTimeoutId = setTimeout(() => {
        this.phase.set('flash');
        this.displaySprite.set(target.spriteUrls.evolving || target.spriteUrls.normal);
      }, halfDuration);

      this.revealTimeoutId = setTimeout(() => {
        this.phase.set('reveal');
        this.displaySprite.set(target.spriteUrls.normal);
      }, EVOLUTION_ANIMATION_DURATION_MS);

      this.completeTimeoutId = setTimeout(() => {
        this.visible.set(false);
        this.animationComplete.emit(target);
      }, EVOLUTION_ANIMATION_DURATION_MS + EVOLUTION_REVEAL_DURATION_MS);
    });

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  private clearTimers(): void {
    if (this.swapTimeoutId !== null) {
      clearTimeout(this.swapTimeoutId);
      this.swapTimeoutId = null;
    }

    if (this.revealTimeoutId !== null) {
      clearTimeout(this.revealTimeoutId);
      this.revealTimeoutId = null;
    }

    if (this.completeTimeoutId !== null) {
      clearTimeout(this.completeTimeoutId);
      this.completeTimeoutId = null;
    }
  }
}
