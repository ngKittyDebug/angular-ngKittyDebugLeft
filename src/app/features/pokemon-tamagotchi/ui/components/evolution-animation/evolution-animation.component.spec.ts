import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVOLUTION_ANIMATION_DURATION_MS } from '../../../data/constants/evolution-criteria.constants';
import type { Pokemon } from '../../../models/pokemon.model';
import { EvolutionAnimationComponent } from './evolution-animation.component';

const basePokemon = (id: string, name: string): Pokemon => {
  const spriteUrls = {
    eating: '',
    evolving: `/sprites/${id}-evo.gif`,
    happy: '',
    normal: `/sprites/${id}.gif`,
    sad: '',
    sleeping: '',
  };

  return {
    baseStats: {
      energyRestorationRate: 1,
      experienceMultiplier: 1,
      hungerDecayRate: 1,
      moodDecayRate: 1,
    },
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
    fromPokemon?: Pokemon;
    toPokemon?: Pokemon | null;
  } = {},
): ComponentFixture<EvolutionAnimationComponent> {
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
  });

  it('should create', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('shows overlay while evolution animation is active', () => {
    const fixture = createFixture({ active: true });

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.evolution-animation')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Evolving…');
  });

  it('emits animationComplete with evolved pokemon after duration', () => {
    const fixture = createFixture({ active: true });
    const evolved = basePokemon('26', 'Raichu');
    const completeSpy = vi.fn();

    fixture.componentRef.setInput('toPokemon', evolved);
    fixture.componentInstance.animationComplete.subscribe(completeSpy);
    fixture.detectChanges();

    vi.advanceTimersByTime(EVOLUTION_ANIMATION_DURATION_MS);
    fixture.detectChanges();

    expect(completeSpy).toHaveBeenCalledWith(evolved);
    expect(fixture.nativeElement.querySelector('.evolution-animation')).toBeNull();
  });
});
