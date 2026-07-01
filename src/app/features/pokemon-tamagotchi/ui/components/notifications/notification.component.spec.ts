import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '../../../models/notification.model';
import { NotificationComponent } from './notification.component';

const SAMPLE_NOTIFICATION: Notification = {
  action: { label: 'feed', type: 'feed' },
  id: 'n-1',
  message: 'alerts.hungerLow.message',
  priority: 'warning',
  read: false,
  timestamp: 1,
  title: 'alerts.hungerLow.title',
};

function createFixture(
  notifications: Notification[] = [SAMPLE_NOTIFICATION],
): ComponentFixture<NotificationComponent> {
  TestBed.configureTestingModule({
    imports: [
      NotificationComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            pokemonTamagotchi: {
              actions: { feed: 'Feed' },
              notifications: {
                alerts: {
                  hungerLow: {
                    message: 'Your Pokémon is hungry.',
                    title: 'Getting hungry',
                  },
                },
                dismiss: 'Dismiss',
                empty: 'No notifications yet',
                hideHistory: 'Hide history',
                showHistory: 'Show history',
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
  });

  const fixture = TestBed.createComponent(NotificationComponent);

  fixture.componentRef.setInput('notifications', notifications);
  fixture.detectChanges();

  return fixture;
}

describe('NotificationComponent', () => {
  it('should create', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('renders unread notifications with translated title', () => {
    const element = createFixture().nativeElement as HTMLElement;

    expect(element.textContent).toContain('Getting hungry');
    expect(element.textContent).toContain('Your Pokémon is hungry.');
  });

  it('emits dismissed when close button is clicked', () => {
    const fixture = createFixture();
    const dismissed = vi.fn();

    fixture.componentInstance.dismissed.subscribe(dismissed);
    (fixture.nativeElement as HTMLElement)
      .querySelector('button[aria-label="Dismiss"]')
      ?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(dismissed).toHaveBeenCalledWith('n-1');
  });

  it('emits actionSelected when action button is clicked', () => {
    const fixture = createFixture();
    const actionSelected = vi.fn();

    fixture.componentInstance.actionSelected.subscribe(actionSelected);
    (fixture.nativeElement as HTMLElement)
      .querySelector('.tamagotchi-notifications__actions button')
      ?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(actionSelected).toHaveBeenCalledWith('feed');
  });

  it('shows empty state when there are no notifications', () => {
    const element = createFixture([]).nativeElement as HTMLElement;

    expect(element.textContent).toContain('No notifications yet');
  });
});
