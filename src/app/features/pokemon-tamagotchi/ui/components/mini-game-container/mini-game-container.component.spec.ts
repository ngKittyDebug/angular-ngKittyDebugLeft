import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import { MiniGameContainerComponent } from './mini-game-container.component';

describe('MiniGameContainerComponent', () => {
  it('lazy-loads mini-game component when game type is provided', async () => {
    await TestBed.configureTestingModule({
      imports: [
        MiniGameContainerComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              pokemonTamagotchi: {
                miniGame: {
                  finish: 'Finish',
                  instruction: 'Tap targets',
                  score: 'Score {{score}}',
                  timeLeft: '{{seconds}}s',
                  title: 'Training',
                },
              },
            },
          },
        }),
      ],
    }).compileComponents();

    const fixture: ComponentFixture<MiniGameContainerComponent> = TestBed.createComponent(
      MiniGameContainerComponent,
    );

    fixture.componentRef.setInput('gameType', 'reflex');
    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('left-paw-mini-game')).toBeTruthy();
    });

    expect(fixture.nativeElement.querySelector('.mini-game-container__loader')).toBeNull();
  });
});
