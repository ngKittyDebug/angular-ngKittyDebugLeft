import { computed, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PERFORMANCE_PROFILES } from '../../../data/constants/performance-mode.constants';
import { TEST_POKEMON } from '../../../data/fixtures/tamagotchi-arbitraries';
import type { PerformanceMode } from '../../../data/models/performance-mode.model';
import { PerformanceService } from '../../../data/services/performance.service';
import { createInitialPokemonStatus } from '../../../data/store/tamagotchi-initial';
import { AnimationService } from '../../services/animation.service';
import { PokemonSpriteComponent } from './pokemon-sprite.component';

type PerformanceServiceSpriteMock = Pick<PerformanceService, 'mode' | 'profile'>;

async function createFixture(
  complexAnimations = true,
  options: { complexAnimationsSignal?: WritableSignal<boolean> } = {},
): Promise<ComponentFixture<PokemonSpriteComponent>> {
  const complexAnimationsSignal = options.complexAnimationsSignal ?? signal(complexAnimations);
  const performanceServiceMock = {
    mode: signal<PerformanceMode>('high').asReadonly(),
    profile: computed(() => ({
      ...PERFORMANCE_PROFILES.high,
      complexAnimations: complexAnimationsSignal(),
    })),
  } as const satisfies PerformanceServiceSpriteMock;

  await TestBed.configureTestingModule({
    imports: [PokemonSpriteComponent],
    providers: [
      AnimationService,
      { provide: PerformanceService, useValue: performanceServiceMock },
    ],
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

function dispatchPointerEvent(
  button: HTMLButtonElement,
  type: 'pointerdown' | 'pointerup',
  pointerId: number,
): void {
  button.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      clientX: 10,
      clientY: 10,
      pointerId,
      pointerType: 'touch',
    }),
  );
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

    it('должен синхронизировать gpu compositing при смене режима производительности', async () => {
      const complexAnimations = signal(true);
      const fixture = await createFixture(true, { complexAnimationsSignal: complexAnimations });
      const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

      await fixture.whenStable();

      expect(image.classList.contains('tamagotchi-gpu-layer')).toBe(true);

      complexAnimations.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(image.classList.contains('tamagotchi-gpu-layer')).toBe(false);
    });

    it('должен очищать pointer-сессию, если эволюция началась до pointer up', async () => {
      const fixture = await createFixture();
      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

      dispatchPointerEvent(button, 'pointerdown', 1);
      fixture.componentRef.setInput('isEvolving', true);
      fixture.detectChanges();
      dispatchPointerEvent(button, 'pointerup', 1);
      fixture.componentRef.setInput('isEvolving', false);
      fixture.detectChanges();
      dispatchPointerEvent(button, 'pointerdown', 2);
      fixture.detectChanges();

      expect(image.classList.contains('sprite-sparkle')).toBe(false);
    });
  });
});
