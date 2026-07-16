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
                cooldownAria: '{{action}} — available in {{seconds}}s',
                disabledAria: '{{action}} — unavailable: {{reason}}',
                disabledLowEnergy: 'Not enough energy',
                disabledCooldown: 'On cooldown',
                disabledTraining: 'Training in progress',
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
  describe('Happy Path', () => {
    it('должен создаваться', () => {
      expect(createFixture().componentInstance).toBeTruthy();
    });

    it('должен отображать все действия ухода и сон, когда покемон не спит', () => {
      const labels = buttonLabels(createFixture().nativeElement as HTMLElement);

      expect(labels).toEqual(['Feed', 'Water', 'Care', 'Play', 'Train', 'Sleep']);
    });

    it('должен эмитить actionSelected при клике по активной кнопке', () => {
      const fixture = createFixture();
      const emitSpy = vi.spyOn(fixture.componentInstance.actionSelected, 'emit');
      const playButton = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-buttons__btn'),
      ].find((node) => node.textContent?.trim() === 'Play') as HTMLButtonElement;

      playButton.click();
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenNthCalledWith(1, 'play' satisfies ActionType);
    });
  });

  describe('Edge Cases', () => {
    it('должен отображать только кнопку пробуждения во время сна', () => {
      const labels = buttonLabels(createFixture({ isSleeping: true }).nativeElement as HTMLElement);

      expect(labels).toEqual(['Wake up']);
    });

    it('должен отключать действие, пока активен кулдаун', () => {
      const element = createFixture({
        cooldowns: { ...EMPTY_COOLDOWNS, feed: 45_000 },
      }).nativeElement as HTMLElement;
      const feedButton = [...element.querySelectorAll('.action-buttons__btn')].find(
        (node) => node.textContent?.trim() === 'Feed',
      ) as HTMLButtonElement;

      expect(feedButton.disabled).toBe(false);
      expect(feedButton.getAttribute('aria-disabled')).toBe('true');
      expect(feedButton.getAttribute('aria-label')).toBe('Feed — available in 45s');
    });

    it('должен озвучивать причину блокировки тренировки в aria-label', () => {
      const fixture = createFixture();

      fixture.componentRef.setInput('actionsLocked', true);
      fixture.detectChanges();

      const feedButton = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-buttons__btn'),
      ].find((node) => node.textContent?.trim() === 'Feed') as HTMLButtonElement;

      expect(feedButton.getAttribute('aria-label')).toBe(
        'Feed — unavailable: Training in progress',
      );
    });

    it('должен оставлять недоступную кнопку в tab order и не эмитить клик', () => {
      const fixture = createFixture({
        cooldowns: { ...EMPTY_COOLDOWNS, feed: 45_000 },
      });
      const emitSpy = vi.spyOn(fixture.componentInstance.actionSelected, 'emit');
      const feedButton = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-buttons__btn'),
      ].find((node) => node.textContent?.trim() === 'Feed') as HTMLButtonElement;

      feedButton.focus();
      feedButton.click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(feedButton);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('должен включать кнопку, когда cooldown input очищается без перезагрузки', () => {
      const fixture = createFixture({
        cooldowns: { ...EMPTY_COOLDOWNS, feed: 45_000 },
      });
      const feedButton = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      ].find((node) => node.textContent?.trim() === 'Feed') as HTMLButtonElement;

      fixture.componentRef.setInput('cooldowns', EMPTY_COOLDOWNS);
      fixture.detectChanges();

      expect(feedButton.hasAttribute('aria-disabled')).toBe(false);
    });

    it('должен отключать тренировку при низкой энергии', () => {
      const element = createFixture({ canTrain: false }).nativeElement as HTMLElement;
      const trainButton = [...element.querySelectorAll('.action-buttons__btn')].find(
        (node) => node.textContent?.trim() === 'Train',
      ) as HTMLButtonElement;

      expect(trainButton.getAttribute('aria-disabled')).toBe('true');
    });

    it('должен оставлять play доступным во время блокировки тренировки', () => {
      const fixture = createFixture();

      fixture.componentRef.setInput('actionsLocked', true);
      fixture.detectChanges();

      const playButton = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-buttons__btn'),
      ].find((node) => node.textContent?.trim() === 'Play') as HTMLButtonElement;
      const feedButton = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-buttons__btn'),
      ].find((node) => node.textContent?.trim() === 'Feed') as HTMLButtonElement;

      expect(playButton.hasAttribute('aria-disabled')).toBe(false);
      expect(feedButton.getAttribute('aria-disabled')).toBe('true');
    });

    it('должен эмитить sleep при клике по Wake up во время сна', () => {
      const fixture = createFixture({ isSleeping: true });
      const emitSpy = vi.spyOn(fixture.componentInstance.actionSelected, 'emit');
      const wakeButton = (fixture.nativeElement as HTMLElement).querySelector(
        '.action-buttons__btn',
      ) as HTMLButtonElement;

      wakeButton.click();
      fixture.detectChanges();

      expect(wakeButton.textContent?.trim()).toBe('Wake up');
      expect(emitSpy).toHaveBeenNthCalledWith(1, 'sleep' satisfies ActionType);
    });
  });
});
