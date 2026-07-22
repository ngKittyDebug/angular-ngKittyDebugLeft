import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Stage } from '@game/frenzy/types';
import { describe, expect, it } from 'vitest';

import { bodyForAppearance } from '../../../data/constants/pokemon-body';
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
              effects: {
                shield: 'Shielded',
                wellFed: 'Well fed',
                laying: 'Laying eggs',
                pooping: 'Upset stomach',
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
  // gates 500/1000 (matches the 1000 next-evolution threshold the assertions below expect).
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

    // hp 412, stage 2 → next threshold 1000 → 588 remaining.
    expect(text).toContain('to evolve 588');
  });

  it('counts down to the first evolution gate on stage 1', () => {
    const element = createFixture({ name: 'Sparky', hp: 100, stage: 1 })
      .nativeElement as HTMLElement;

    // hp 100, stage 1 → first gate 500 → 400 remaining.
    expect(element.textContent ?? '').toContain('to evolve 400');
  });

  it('marks both evolution thresholds on a non-final stage', () => {
    const element = createFixture().nativeElement as HTMLElement;

    expect(element.querySelectorAll('.current-pokemon-status__tick')).toHaveLength(2);
  });

  it('keeps both evolution ticks but hides the until-evolution line on the final stage', () => {
    const element = createFixture({ name: 'Sparky', hp: 1100, stage: 3 })
      .nativeElement as HTMLElement;

    expect(element.querySelectorAll('.current-pokemon-status__tick')).toHaveLength(2);
    expect(element.querySelector('.current-pokemon-status__until')).toBeNull();
    expect(element.textContent ?? '').not.toContain('to evolve');
  });

  it('renders the mood avatar', () => {
    const element = createFixture().nativeElement as HTMLElement;

    expect(element.querySelector('.current-pokemon-status__avatar')).not.toBeNull();
  });

  it('hides the buff strip when there are no active effects', () => {
    const element = createFixture().nativeElement as HTMLElement;

    expect(element.querySelector('.current-pokemon-status__buffs')).toBeNull();
  });

  it('renders a buff chip per active effect, labelled from frenzy.effects', () => {
    const fixture = createFixture();

    fixture.componentRef.setInput('effects', [
      { kind: 'shield', expiresAt: 0 },
      { kind: 'pooping', expiresAt: 0 },
    ]);
    fixture.detectChanges();

    const chips = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.current-pokemon-status__buff',
    );

    expect(chips).toHaveLength(2);
    expect(chips[0].getAttribute('aria-label')).toBe('Shielded');
    expect(chips[1].getAttribute('aria-label')).toBe('Upset stomach');
  });
});
