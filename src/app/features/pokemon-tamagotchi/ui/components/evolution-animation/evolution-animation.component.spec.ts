import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVOLUTION_ANIMATION_DURATION_MS,
  EVOLUTION_REDUCED_ANIMATION_DURATION_MS,
  EVOLUTION_REVEAL_DURATION_MS,
} from '../../../data/constants/evolution-criteria.constants';
import { PERFORMANCE_PROFILES } from '../../../data/constants/performance-mode.constants';
import type { PerformanceMode } from '../../../data/models/performance-mode.model';
import type { PokemonModel } from '../../../data/models/pokemon.model';
import { PerformanceService } from '../../../data/services/performance.service';
import { AnimationService } from '../../services/animation.service';
import { EvolutionAnimationComponent } from './evolution-animation.component';

const basePokemon = (id: string, name: string): PokemonModel => {
  const spriteUrls = {
    eating: '',
    evolving: `/sprites/${id}-evo.gif`,
    happy: '',
    normal: `/sprites/${id}.gif`,
    sad: '',
    sleeping: '',
  };

  return {
    evolutionChain: { currentStage: 1, totalStages: 3 },
    id,
    isFirstStage: true,
    name,
    species: name.toLowerCase(),
    spriteUrls,
    spriteVariations: {
      default: spriteUrls,
      retro: spriteUrls,
      shiny: spriteUrls,
    },
  };
};

function createFixture(
  inputs: {
    active?: boolean;
    fromPokemon?: PokemonModel;
    performanceMode?: PerformanceMode;
    toPokemon?: PokemonModel | null;
  } = {},
): ComponentFixture<EvolutionAnimationComponent> {
  const performanceMode = signal<PerformanceMode>(inputs.performanceMode ?? 'balanced');

  TestBed.configureTestingModule({
    imports: [
      EvolutionAnimationComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            pokemonTamagotchi: {
              evolution: {
                evolving: 'Evolving…',
                evolvingAria: '{{name}} is evolving',
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
    providers: [
      AnimationService,
      {
        provide: PerformanceService,
        useValue: {
          mode: performanceMode.asReadonly(),
          profile: () => PERFORMANCE_PROFILES[performanceMode()],
          setMode: vi.fn(),
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(EvolutionAnimationComponent);

  fixture.componentRef.setInput('fromPokemon', inputs.fromPokemon ?? basePokemon('25', 'Pikachu'));
  fixture.componentRef.setInput('toPokemon', inputs.toPokemon ?? basePokemon('26', 'Raichu'));
  fixture.componentRef.setInput('active', inputs.active ?? false);
  fixture.detectChanges();

  return fixture;
}

describe('EvolutionAnimationComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('Happy Path', () => {
    it('должен создаваться', () => {
      expect(createFixture().componentInstance).toBeTruthy();
    });

    it('должен показывать оверлей, пока активна анимация эволюции', () => {
      const fixture = createFixture({ active: true });

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.evolution-animation')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Evolving…');
    });

    it('должен показывать фазу reveal до эмита animationComplete', () => {
      const fixture = createFixture({ active: true });
      const evolved = basePokemon('26', 'Raichu');
      const completeSpy = vi.fn();

      fixture.componentRef.setInput('toPokemon', evolved);
      fixture.componentInstance.animationComplete.subscribe(completeSpy);
      fixture.detectChanges();

      vi.advanceTimersByTime(EVOLUTION_ANIMATION_DURATION_MS);
      fixture.detectChanges();

      expect(completeSpy).toHaveBeenCalledTimes(0);
      expect(fixture.nativeElement.querySelector('.evolution-animation')).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('.evolution-animation__sprite--reveal'),
      ).toBeTruthy();

      vi.advanceTimersByTime(EVOLUTION_REVEAL_DURATION_MS);
      fixture.detectChanges();

      expect(completeSpy).toHaveBeenNthCalledWith(1, evolved);
      expect(fixture.nativeElement.querySelector('.evolution-animation')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('должен завершать анимацию по короткому пути в performance low', () => {
      const fixture = createFixture({ active: true, performanceMode: 'low' });
      const evolved = basePokemon('26', 'Raichu');
      const completeSpy = vi.fn();

      fixture.componentRef.setInput('toPokemon', evolved);
      fixture.componentInstance.animationComplete.subscribe(completeSpy);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.evolution-animation__sprite--reduced'),
      ).toBeTruthy();

      vi.advanceTimersByTime(EVOLUTION_REDUCED_ANIMATION_DURATION_MS);
      fixture.detectChanges();

      expect(completeSpy).toHaveBeenNthCalledWith(1, evolved);
      expect(fixture.nativeElement.querySelector('.evolution-animation')).toBeNull();
    });
  });
});
