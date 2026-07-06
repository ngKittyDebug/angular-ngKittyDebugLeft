import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import type { NotificationModel } from '../../../data/models/notification.model';
import { NotificationComponent } from './notification.component';

const SAMPLE_NOTIFICATION: NotificationModel = {
  id: 'notification-1',
  message: 'alerts.hungerLow.message',
  priority: 'warning',
  read: false,
  timestamp: Date.now(),
  title: 'alerts.hungerLow.title',
};

function createFixture(
  notifications: NotificationModel[] = [SAMPLE_NOTIFICATION],
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

  fixture.componentRef.setInput('notifications', notifications);
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

      toggle?.dispatchEvent(new Event('click'));
      fixture.detectChanges();

      expect(element.textContent).toContain('Getting hungry');
      expect(element.textContent).toContain('Your Pokémon is hungry.');
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
