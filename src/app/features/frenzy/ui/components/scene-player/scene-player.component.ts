import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon } from '@taiga-ui/core';
import { TuiProgressBar } from '@taiga-ui/kit';

import type { OwnedSpark } from '../../../data/models/hit-burst';
import type { OwnedShieldBlock } from '../../../data/models/shield-block';
import { spritePathFor } from '../../constants/pokemon-registry';
import { BubbleSkinDirective } from '../../directives/bubble-skin.directive';
import { HpToneColorPipe } from '../../pipes/hp-tone-color.pipe';
import type { RenderedPlayer } from '../scene/scene-view-models';
import { SpriteFreezeService } from '../scene/rendering/canvas/sprite-freeze.service';
import { SparkBurstComponent } from '../spark-burst/spark-burst.component';

/**
 * One drifting Pokémon: effect auras, the (flippable) sprite, name, the other-players' hp bar and impact sparks.
 * (Floating quips render in the scene's owned-float overlay, not here — see `.scene__owned-floats`.) Presentational
 * — the scene positions the host via `leftPawScenePosition` and carries the `--scene-sprite-height` it sets. Only my
 * own sprite is wrapped in the poke button (emits `poke`); the sprite markup itself is shared via an
 * `ngTemplateOutlet` so me/others never drift apart.
 */
@Component({
  selector: 'left-paw-scene-player',
  imports: [
    BubbleSkinDirective,
    HpToneColorPipe,
    NgTemplateOutlet,
    SparkBurstComponent,
    TranslocoDirective,
    TuiIcon,
    TuiProgressBar,
  ],
  templateUrl: './scene-player.component.html',
  styleUrl: './scene-player.component.scss',
  host: {
    '[class.scene__player--me]': 'player().isMe',
    '[class.scene__player--disconnected]': 'player().isDisconnected',
    '[style.--scene-sprite-width]': 'player().spriteWidth',
    '[style.--scene-sprite-height]': 'player().spriteHeight',
    '[style.--scene-hitbox-height]': 'player().hitboxHeight',
    '[style.--scene-sprite-offset-x]': "(-player().spriteOffsetX) + 'px'",
    '[style.--scene-sprite-offset-y]': "(-player().spriteOffsetY) + 'px'",
    // NPC anger (0..1) drives the reddening filter on the sprite; 0 for humans (filter is gated to NPCs anyway).
    '[style.--npc-anger]': 'player().npcAnger',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenePlayerComponent {
  private readonly spriteFreeze = inject(SpriteFreezeService);

  public readonly player = input.required<RenderedPlayer>();
  public readonly sparks = input<readonly OwnedSpark[]>([]);
  public readonly shieldBlocks = input<readonly OwnedShieldBlock[]>([]);
  public readonly maxHp = input.required<number>();
  /** Whether this player currently wears the crown (the alive hp-leader). Draws a crown marker over the head. */
  public readonly isLeader = input(false);
  /**
   * When on (the `?debug=perf` "freeze sprites" toggle), render a static first frame instead of the animated GIF —
   * kills the per-frame sprite decode/re-raster that pins the FPS floor on a weak tablet. Off in normal play.
   */
  public readonly freezeSprite = input(false);
  /**
   * Player sprite render backend (the `?debug=perf` "players" toggle): `dom` (default) renders the animated GIF
   * sprite here; `canvas` draws it on the actors-canvas instead, so this component renders chrome only and keeps a
   * sized transparent poke hit-area. Off (dom) in normal play.
   */
  public readonly spritesMode = input<'dom' | 'canvas'>('dom');
  public readonly poke = output<void>();
  /** Emitted with the NPC's id when its (clickable) sprite is poked — unlike `poke`, this reaches the server. */
  public readonly pokeNpc = output<string>();

  // The sprite img src: the animated sprite URL normally; when freezing, its baked static frame (falling back to the
  // animated URL until the bake lands). Uses the same resolver as the `pokemonSprite` pipe, so the path is unchanged.
  protected readonly spriteSrc = computed<string>(() => {
    const url = spritePathFor(this.player().appearance, this.player().stage);

    if (!this.freezeSprite()) {
      return url;
    }

    return this.spriteFreeze.getFrozenUrl(url) ?? url;
  });
}
