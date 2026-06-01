import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import type { FaintedStats } from '../../../data/models/fainted-stats';
import { FaintedModalComponent } from './fainted-modal.component';

const STATS: FaintedStats = {
  eatenByType: { food: 4, rotten: 1, rock: 0, rareCandy: 2 },
  lifespanSeconds: 42,
  maxMass: 230,
  maxStage: 2,
  totalEaten: 7,
};

function createFixture(respawnReady: boolean): ComponentFixture<FaintedModalComponent> {
  TestBed.configureTestingModule({
    imports: [
      FaintedModalComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            frenzy: {
              faintedModal: {
                title: 'Pokémon fainted!',
                lifespan: 'Survived',
                lifespanValue: '{{seconds}} s',
                maxMass: 'Peak mass',
                maxStage: 'Top stage',
                totalEaten: 'Items eaten',
                items: { food: 'Berries', rotten: 'Rotten', rock: 'Rocks', rareCandy: 'Candy' },
                respawn: 'Play again',
                chooseNew: 'Choose new Pokémon',
                cooldownHint: 'Ready in {{seconds}} s',
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
  });

  const fixture = TestBed.createComponent(FaintedModalComponent);

  fixture.componentRef.setInput('stats', STATS);
  fixture.componentRef.setInput('respawnReady', respawnReady);
  fixture.componentRef.setInput('cooldownSeconds', respawnReady ? 0 : 3);
  fixture.detectChanges();

  return fixture;
}

function buttonByText(element: HTMLElement, text: string): HTMLButtonElement | undefined {
  return [...element.querySelectorAll('button')].find((button) =>
    button.textContent?.includes(text),
  );
}

describe('FaintedModalComponent', () => {
  it('renders session stats', () => {
    const text = (createFixture(true).nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Pokémon fainted!');
    expect(text).toContain('42 s');
    expect(text).toContain('230');
    expect(text).toContain('II');
    expect(text).toContain('7');
  });

  it('shows only eaten item types in the breakdown', () => {
    const element = createFixture(true).nativeElement as HTMLElement;
    const items = element.querySelectorAll('.fainted-modal__item');

    expect(items).toHaveLength(3);
  });

  it('disables both actions and shows the cooldown hint while on cooldown', () => {
    const element = createFixture(false).nativeElement as HTMLElement;

    expect(buttonByText(element, 'Play again')?.disabled).toBe(true);
    expect(buttonByText(element, 'Choose new Pokémon')?.disabled).toBe(true);
    expect(element.textContent ?? '').toContain('Ready in 3 s');
  });

  it('enables both actions and hides the cooldown hint when ready', () => {
    const element = createFixture(true).nativeElement as HTMLElement;

    expect(buttonByText(element, 'Play again')?.disabled).toBe(false);
    expect(buttonByText(element, 'Choose new Pokémon')?.disabled).toBe(false);
    expect(element.textContent ?? '').not.toContain('Ready in');
  });

  it('emits respawn when the play-again button is clicked', () => {
    const fixture = createFixture(true);
    const spy = vi.fn();

    fixture.componentInstance.respawn.subscribe(spy);
    buttonByText(fixture.nativeElement as HTMLElement, 'Play again')?.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits chooseNew when the choose-new button is clicked', () => {
    const fixture = createFixture(true);
    const spy = vi.fn();

    fixture.componentInstance.chooseNew.subscribe(spy);
    buttonByText(fixture.nativeElement as HTMLElement, 'Choose new Pokémon')?.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
