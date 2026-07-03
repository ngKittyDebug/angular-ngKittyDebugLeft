import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import type { ActionCooldowns, ActionType } from '../../../data/models/tamagotchi-state.model';
import { ActionButtonsComponent } from './action-buttons.component';

const EMPTY_COOLDOWNS: ActionCooldowns = {
  care: null,
  feed: null,
  play: null,
  sleep: null,
  train: null,
  water: null,
};

function createFixture(
  inputs: {
    canFeed?: boolean;
    canPlay?: boolean;
    canTrain?: boolean;
    canWater?: boolean;
    canCare?: boolean;
    cooldowns?: ActionCooldowns;
    isSleeping?: boolean;
  } = {},
): ComponentFixture<ActionButtonsComponent> {
  TestBed.configureTestingModule({
    imports: [
      ActionButtonsComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            pokemonTamagotchi: {
              actions: {
                feed: 'Feed',
                water: 'Water',
                care: 'Care',
                play: 'Play',
                train: 'Train',
                sleep: 'Sleep',
                wakeUp: 'Wake up',
                cooldown: 'Available in {{seconds}}s',
                disabledLowEnergy: 'Not enough energy',
                disabledCooldown: 'On cooldown',
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
  });

  const fixture = TestBed.createComponent(ActionButtonsComponent);

  fixture.componentRef.setInput('cooldowns', inputs.cooldowns ?? EMPTY_COOLDOWNS);
  fixture.componentRef.setInput('isSleeping', inputs.isSleeping ?? false);
  fixture.componentRef.setInput('canFeed', inputs.canFeed ?? true);
  fixture.componentRef.setInput('canWater', inputs.canWater ?? true);
  fixture.componentRef.setInput('canCare', inputs.canCare ?? true);
  fixture.componentRef.setInput('canPlay', inputs.canPlay ?? true);
  fixture.componentRef.setInput('canTrain', inputs.canTrain ?? true);
  fixture.detectChanges();

  return fixture;
}

function buttonLabels(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.action-buttons__btn')].map(
    (node) => node.textContent?.trim() ?? '',
  );
}

describe('ActionButtonsComponent', () => {
  it('should create', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('renders all awake care actions plus sleep when not sleeping', () => {
    const labels = buttonLabels(createFixture().nativeElement as HTMLElement);

    expect(labels).toEqual(['Feed', 'Water', 'Care', 'Play', 'Train', 'Sleep']);
  });

  it('renders only the wake-up control while sleeping', () => {
    const labels = buttonLabels(createFixture({ isSleeping: true }).nativeElement as HTMLElement);

    expect(labels).toEqual(['Wake up']);
  });

  it('disables an action while its cooldown is active', () => {
    const element = createFixture({
      cooldowns: { ...EMPTY_COOLDOWNS, feed: 45_000 },
    }).nativeElement as HTMLElement;
    const feedButton = [...element.querySelectorAll('.action-buttons__btn')].find(
      (node) => node.textContent?.trim() === 'Feed',
    ) as HTMLButtonElement;

    expect(feedButton.disabled).toBe(true);
  });

  it('disables train when energy is too low', () => {
    const element = createFixture({ canTrain: false }).nativeElement as HTMLElement;
    const trainButton = [...element.querySelectorAll('.action-buttons__btn')].find(
      (node) => node.textContent?.trim() === 'Train',
    ) as HTMLButtonElement;

    expect(trainButton.disabled).toBe(true);
  });

  it('emits actionSelected when an enabled button is clicked', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.actionSelected, 'emit');
    const playButton = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-buttons__btn'),
    ].find((node) => node.textContent?.trim() === 'Play') as HTMLButtonElement;

    playButton.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith('play' satisfies ActionType);
  });

  it('emits wakeUp action label as sleep action type while sleeping', () => {
    const fixture = createFixture({ isSleeping: true });
    const emitSpy = vi.spyOn(fixture.componentInstance.actionSelected, 'emit');
    const wakeButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.action-buttons__btn',
    ) as HTMLButtonElement;

    wakeButton.click();
    fixture.detectChanges();

    expect(wakeButton.textContent?.trim()).toBe('Wake up');
    expect(emitSpy).toHaveBeenCalledWith('sleep' satisfies ActionType);
  });
});
