import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiProgressBar } from '@taiga-ui/kit';

import type { OwnedFloat } from '../../../data/models/floating-message';
import type { OwnedSpark } from '../../../data/models/hit-burst';
import type { OwnedShieldBlock } from '../../../data/models/shield-block';
import { BubbleSkinDirective } from '../../directives/bubble-skin.directive';
import { HpToneColorPipe } from '../../pipes/hp-tone-color.pipe';
import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';
import { FloatingTextComponent } from '../floating-text/floating-text.component';
import type { RenderedPlayer } from '../scene/scene-view-models';
import { SparkBurstComponent } from '../spark-burst/spark-burst.component';

/**
 * One drifting Pokémon: effect auras, the (flippable) sprite, name, the other-players' hp bar and the player's
 * own floating quips. Presentational — the scene positions the host via `leftPawScenePosition` and carries the
 * `--scene-sprite-height` it sets. Only my own sprite is wrapped in the poke button (emits `poke`); the sprite
 * markup itself is shared via an `ngTemplateOutlet` so me/others never drift apart.
 */
@Component({
  selector: 'left-paw-scene-player',
  imports: [
    BubbleSkinDirective,
    FloatingTextComponent,
    HpToneColorPipe,
    NgTemplateOutlet,
    PokemonSpritePipe,
    SparkBurstComponent,
    TranslocoDirective,
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
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenePlayerComponent {
  public readonly player = input.required<RenderedPlayer>();
  public readonly floats = input<readonly OwnedFloat[]>([]);
  public readonly sparks = input<readonly OwnedSpark[]>([]);
  public readonly shieldBlocks = input<readonly OwnedShieldBlock[]>([]);
  public readonly maxHp = input.required<number>();
  public readonly shieldAuraClass = input.required<string>();
  public readonly poke = output<void>();
}
