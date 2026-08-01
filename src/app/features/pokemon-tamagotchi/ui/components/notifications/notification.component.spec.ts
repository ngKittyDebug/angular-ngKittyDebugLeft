import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import type { NotificationModel } from '../../../data/models/notification.model';
import { NotificationComponent } from './notification.component';

const SAMPLE_NOTIFICATION: NotificationModel = {
  id: 'notification-1',
  message: { key: 'alerts.hungerLow.message', kind: 'translationKey' },
  priority: 'warning',
  read: false,
  timestamp: Date.now(),
  title: { key: 'alerts.hungerLow.title', kind: 'translationKey' },
};

const PLAIN_TEXT_NOTIFICATION: NotificationModel = {
  id: 'notification-2',
  message: { kind: 'plainText', text: 'Progress saved.' },
  priority: 'info',
  read: false,
  timestamp: Date.now(),
  title: { kind: 'plainText', text: 'Mr. Mime' },
};

function createFixture(
  notificationList: NotificationModel[] = [SAMPLE_NOTIFICATION],
): ComponentFixture<NotificationComponent> {
  TestBed.configureTestingModule({
    imports: [
      NotificationComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            pokemonTamagotchi: {
              notifications: {
                alerts: {
                  hungerLow: {
                    message: 'Your Pokémon is hungry.',
                    title: 'Getting hungry',
                  },
                },
                empty: 'No notifications yet',
                hideHistory: 'Hide history',
                showHistory: 'Show history',
              },
            },
          },
        },
        translocoConfig: {
          availableLangs: ['en'],
          defaultLang: 'en',
        },
      }),
    ],
  });

  const fixture = TestBed.createComponent(NotificationComponent);

  fixture.componentRef.setInput('notificationList', notificationList);
  fixture.detectChanges();

  return fixture;
}

describe('NotificationComponent', () => {
  describe('Happy Path', () => {
    it('должен отображать переключатель истории с количеством уведомлений', () => {
      const fixture = createFixture();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.textContent).toContain('Show history');
      expect(element.textContent).toContain('(1)');
    });

    it('должен показывать записи истории при раскрытии', () => {
      const fixture = createFixture();
      const element = fixture.nativeElement as HTMLElement;
      const toggle = element.querySelector('button');

      expect(element.querySelector('section')?.hasAttribute('aria-live')).toBe(false);
      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      expect(toggle?.getAttribute('aria-controls')).toBe('tamagotchi-notifications-history');
      expect(element.querySelector('#tamagotchi-notifications-history')).toBeTruthy();
      expect(
        (element.querySelector('#tamagotchi-notifications-history') as HTMLElement).hidden,
      ).toBe(true);

      toggle?.dispatchEvent(new Event('click'));
      fixture.detectChanges();

      expect(toggle?.getAttribute('aria-expanded')).toBe('true');
      expect(
        (element.querySelector('#tamagotchi-notifications-history') as HTMLElement).hidden,
      ).toBe(false);
      expect(element.textContent).toContain('Getting hungry');
      expect(element.textContent).toContain('Your Pokémon is hungry.');
    });

    it('должен показывать plain text без попытки перевода', () => {
      const fixture = createFixture([PLAIN_TEXT_NOTIFICATION]);
      const element = fixture.nativeElement as HTMLElement;
      const toggle = element.querySelector('button');

      toggle?.dispatchEvent(new Event('click'));
      fixture.detectChanges();

      expect(element.textContent).toContain('Mr. Mime');
      expect(element.textContent).toContain('Progress saved.');
    });
  });

  describe('Edge Cases', () => {
    it('должен показывать пустое состояние, когда уведомлений нет', () => {
      const fixture = createFixture([]);
      const element = fixture.nativeElement as HTMLElement;

      expect(element.textContent).toContain('No notifications yet');
    });
  });
});
