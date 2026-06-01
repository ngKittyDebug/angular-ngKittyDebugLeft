import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { FloatingTextComponent } from './floating-text.component';
import type { FloatingTone } from '../../../data/models/floating-message';

interface Inputs {
  who?: string;
  text: string;
  delta?: number;
  tone?: FloatingTone;
  icon?: string;
  durationMs?: number;
}

function createFixture(inputs: Inputs): ComponentFixture<FloatingTextComponent> {
  TestBed.configureTestingModule({ imports: [FloatingTextComponent] });

  const fixture = TestBed.createComponent(FloatingTextComponent);

  fixture.componentRef.setInput('text', inputs.text);

  if (inputs.who !== undefined) {
    fixture.componentRef.setInput('who', inputs.who);
  }

  if (inputs.delta !== undefined) {
    fixture.componentRef.setInput('delta', inputs.delta);
  }

  if (inputs.tone !== undefined) {
    fixture.componentRef.setInput('tone', inputs.tone);
  }

  if (inputs.icon !== undefined) {
    fixture.componentRef.setInput('icon', inputs.icon);
  }

  if (inputs.durationMs !== undefined) {
    fixture.componentRef.setInput('durationMs', inputs.durationMs);
  }

  fixture.detectChanges();

  return fixture;
}

describe('FloatingTextComponent', () => {
  it('renders the phrase and the player name', () => {
    const element = createFixture({ who: 'Ash', text: 'Yum!' }).nativeElement as HTMLElement;

    expect(element.textContent ?? '').toContain('Ash');
    expect(element.textContent ?? '').toContain('Yum!');
  });

  it('prefixes a positive delta with a plus sign', () => {
    const element = createFixture({ text: 'Yum!', delta: 10 }).nativeElement as HTMLElement;

    expect(element.querySelector('.floating-text__delta')?.textContent?.trim()).toBe('+10');
  });

  it('shows a negative delta as-is', () => {
    const element = createFixture({ text: 'Yuck!', delta: -15 }).nativeElement as HTMLElement;

    expect(element.querySelector('.floating-text__delta')?.textContent?.trim()).toBe('-15');
  });

  it('omits the delta node when no delta is provided', () => {
    const element = createFixture({ text: 'Evolved!' }).nativeElement as HTMLElement;

    expect(element.querySelector('.floating-text__delta')).toBeNull();
  });

  it('reflects the tone as a host class', () => {
    const host = createFixture({ text: 'Hang on!', tone: 'warning' }).nativeElement as HTMLElement;

    expect(host.classList.contains('floating-text--warning')).toBe(true);
  });

  it('drives the animation duration from the durationMs input', () => {
    const host = createFixture({ text: 'Gone…', durationMs: 5500 }).nativeElement as HTMLElement;

    expect(host.style.animationDuration).toBe('5500ms');
  });

  it('renders a Taiga icon when one is provided', () => {
    const element = createFixture({ text: 'Gone…', icon: '@tui.skull' })
      .nativeElement as HTMLElement;

    expect(element.querySelector('tui-icon')).not.toBeNull();
  });
});
