import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { PERFORMANCE_PROFILES } from '../../../data/constants/performance-mode.constants';
import { TEST_POKEMON } from '../../../data/fixtures/tamagotchi-arbitraries';
import type { PerformanceMode } from '../../../data/models/performance-mode.model';
import { PerformanceService } from '../../../data/services/performance.service';
import { createInitialPokemonStatus } from '../../../data/store/tamagotchi-initial';
import { PokemonSpriteComponent } from './pokemon-sprite.component';

type PerformanceServiceSpriteMock = Pick<PerformanceService, 'getProfile' | 'mode'>;

async function createFixture(
  complexAnimations = true,
): Promise<ComponentFixture<PokemonSpriteComponent>> {
  const performanceServiceMock = {
    getProfile: vi.fn(() => ({
      ...PERFORMANCE_PROFILES.high,
      complexAnimations,
    })),
    mode: signal<PerformanceMode>('high').asReadonly(),
  } as const satisfies PerformanceServiceSpriteMock;

  await TestBed.configureTestingModule({
    imports: [PokemonSpriteComponent],
    providers: [{ provide: PerformanceService, useValue: performanceServiceMock }],
  }).compileComponents();

  const fixture = TestBed.createComponent(PokemonSpriteComponent);

  fixture.componentRef.setInput('pokemon', TEST_POKEMON);
  fixture.componentRef.setInput('status', createInitialPokemonStatus());
  fixture.detectChanges();

  return fixture;
}

function dispatchAnimationEnd(image: HTMLImageElement, animationName: string): void {
  const event = new Event('animationend', { bubbles: true }) as AnimationEvent;

  Object.defineProperty(event, 'animationName', { value: animationName });
  image.dispatchEvent(event);
}

describe('PokemonSpriteComponent', () => {
  describe('Happy Path', () => {
    it('должен держать feedback-класс до завершения соответствующей анимации', async () => {
      const fixture = await createFixture();
      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

      button.click();
      fixture.detectChanges();
      dispatchAnimationEnd(image, 'sprite-bob');
      fixture.detectChanges();

      expect(image.classList.contains('sprite-pop')).toBe(true);

      dispatchAnimationEnd(image, 'sprite-pop');
      fixture.detectChanges();

      expect(image.classList.contains('sprite-pop')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('не должен добавлять feedback-класс, если сложные анимации отключены', async () => {
      const fixture = await createFixture(false);
      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

      button.click();
      fixture.detectChanges();

      expect(image.classList.contains('sprite-pop')).toBe(false);
    });
  });
});
