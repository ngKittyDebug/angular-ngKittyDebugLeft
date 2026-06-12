import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Stage } from '@game/frenzy/types';
import { describe, expect, it } from 'vitest';

import { bodyForAppearance } from '../../constants/pokemon-registry';
import { CurrentPokemonStatusComponent } from './current-pokemon-status.component';

function createFixture(
  inputs: { name: string; hp: number; stage: Stage } = { name: 'Sparky', hp: 412, stage: 2 },
): ComponentFixture<CurrentPokemonStatusComponent> {
  TestBed.configureTestingModule({
    imports: [
      CurrentPokemonStatusComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            frenzy: {
              currentPokemonStatus: {
                stageBadge: 'STAGE {{stage}}',
                untilEvolution: 'to evolve {{value}}',
                hpLabel: 'HP',
                ariaLabel: 'Your Pokémon status',
                mood: {
                  happy: 'Happy',
                  content: 'Content',
                  hungry: 'Hungry',
                  starving: 'Starving',
                },
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
  });

  const fixture = TestBed.createComponent(CurrentPokemonStatusComponent);

  fixture.componentRef.setInput('name', inputs.name);
  fixture.componentRef.setInput('hp', inputs.hp);
  fixture.componentRef.setInput('stage', inputs.stage);
  // gates 200/500 (matches the 500 next-evolution threshold the assertions below expect).
  fixture.componentRef.setInput('body', bodyForAppearance('caterpie'));
  fixture.detectChanges();

  return fixture;
}

describe('CurrentPokemonStatusComponent', () => {
  it('renders the name and STAGE badge', () => {
    const text = (createFixture().nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Sparky');
    expect(text).toContain('STAGE 2');
  });

  it('shows the HP still needed to reach the next evolution', () => {
    const text = (createFixture().nativeElement as HTMLElement).textContent ?? '';

    // hp 412, stage 2 → next threshold 500 → 88 remaining.
    expect(text).toContain('to evolve 88');
  });

  it('shows the evolution tick on a non-final stage', () => {
    const element = createFixture().nativeElement as HTMLElement;

    expect(element.querySelector('.current-pokemon-status__tick')).not.toBeNull();
  });

  it('hides the until-evolution line and tick on the final stage', () => {
    const element = createFixture({ name: 'Sparky', hp: 900, stage: 3 })
      .nativeElement as HTMLElement;

    expect(element.querySelector('.current-pokemon-status__until')).toBeNull();
    expect(element.querySelector('.current-pokemon-status__tick')).toBeNull();
    expect(element.textContent ?? '').not.toContain('to evolve');
  });

  it('renders the mood avatar', () => {
    const element = createFixture().nativeElement as HTMLElement;

    expect(element.querySelector('.current-pokemon-status__avatar')).not.toBeNull();
  });
});
