import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import type { RenderedPlayer } from '../scene/scene-view-models';
import { SpriteFreezeService } from '../scene/sprite-freeze.service';
import { ScenePlayerComponent } from './scene-player.component';

function renderedPlayer(partial: Partial<RenderedPlayer> = {}): RenderedPlayer {
  return {
    appearance: 'pidgey',
    effectAuras: [],
    shadowEffectClass: null,
    effectBadges: [],
    facingRight: false,
    id: 'p1',
    isDisconnected: false,
    isEvolving: false,
    isMe: false,
    isSad: false,
    isNpc: false,
    npcAnger: 0,
    label: 'Ash',
    hp: 100,
    spriteWidth: '72px',
    spriteHeight: '72px',
    spriteOffsetX: 0,
    spriteOffsetY: 0,
    hitboxWidth: '36px',
    hitboxHeight: '49px',
    debugSpeed: '0.0000',
    debugReadoutOffsetX: '0px',
    debugReadoutOffsetY: '0px',
    stage: 1,
    x: 0.5,
    y: 0.5,
    ...partial,
  };
}

function createFixture(player: RenderedPlayer): ComponentFixture<ScenePlayerComponent> {
  TestBed.configureTestingModule({
    imports: [
      ScenePlayerComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            frenzy: {
              scene: {
                pokeAriaLabel: 'Poke your Pokémon',
                pokeNpcAriaLabel: 'Poke the angry bomb',
              },
              effects: {
                shield: 'Shielded',
                wellFed: 'Well fed',
                laying: 'Laying eggs',
                pooping: 'Upset stomach',
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
    providers: [SpriteFreezeService],
  });

  const fixture = TestBed.createComponent(ScenePlayerComponent);

  fixture.componentRef.setInput('player', player);
  fixture.componentRef.setInput('maxHp', 1500);
  fixture.detectChanges();

  return fixture;
}

describe('ScenePlayerComponent', () => {
  it('renders one badge per active effect, labelled from frenzy.effects', () => {
    const element = createFixture(
      renderedPlayer({
        effectBadges: [
          { kind: 'shield', icon: '@tui.shield', tone: 'positive' },
          { kind: 'pooping', icon: '@tui.wind', tone: 'warning' },
        ],
      }),
    ).nativeElement as HTMLElement;

    const badges = element.querySelectorAll('.scene__effect-badge');

    expect(badges).toHaveLength(2);
    expect(badges[0].getAttribute('aria-label')).toBe('Shielded');
    expect(badges[1].getAttribute('aria-label')).toBe('Upset stomach');
  });

  it('renders no badges when the player has no active effects', () => {
    const element = createFixture(renderedPlayer({ effectBadges: [] }))
      .nativeElement as HTMLElement;

    expect(element.querySelectorAll('.scene__effect-badge')).toHaveLength(0);
  });

  it('renders a neutral grounding shadow under every sprite', () => {
    const element = createFixture(renderedPlayer({ shadowEffectClass: null }))
      .nativeElement as HTMLElement;

    const shadow = element.querySelector('.scene__shadow');

    expect(shadow).not.toBeNull();
    expect(shadow?.className).toBe('scene__shadow');
  });

  it('tints the grounding shadow with the dominant effect modifier class', () => {
    const element = createFixture(renderedPlayer({ shadowEffectClass: 'scene__shadow--shield' }))
      .nativeElement as HTMLElement;

    expect(element.querySelector('.scene__shadow.scene__shadow--shield')).not.toBeNull();
  });

  it('renders the bespoke egg aura as a bare span — no single-tint bubble-skin directive', () => {
    const element = createFixture(
      renderedPlayer({ effectAuras: [{ className: 'scene__laying', render: 'bespoke' }] }),
    ).nativeElement as HTMLElement;

    const aura = element.querySelector<HTMLElement>('.scene__laying');

    expect(aura).not.toBeNull();
    // The directive paints inline `background-image`; the bespoke rainbow is styled wholly in SCSS, so none here.
    expect(aura?.style.backgroundImage).toBe('');
  });

  it('wears the bubble-skin directive on bubble-mode auras (inline glass background)', () => {
    const element = createFixture(
      renderedPlayer({ effectAuras: [{ className: 'scene__shield', render: 'shield' }] }),
    ).nativeElement as HTMLElement;

    expect(element.querySelector<HTMLElement>('.scene__shield')?.style.backgroundImage).not.toBe(
      '',
    );
  });

  it('renders the overhead hp bar for my own sprite too (nameplate for everyone)', () => {
    const element = createFixture(renderedPlayer({ isMe: true, hp: 800 }))
      .nativeElement as HTMLElement;

    expect(element.querySelector('.scene__hp-bar')).not.toBeNull();
  });

  it('renders the overhead hp bar for other players', () => {
    const element = createFixture(renderedPlayer({ isMe: false, hp: 800 }))
      .nativeElement as HTMLElement;

    expect(element.querySelector('.scene__hp-bar')).not.toBeNull();
  });
});
