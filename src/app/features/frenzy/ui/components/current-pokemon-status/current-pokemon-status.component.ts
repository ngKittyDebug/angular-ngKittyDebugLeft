import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon } from '@taiga-ui/core';
import { TuiAvatar, TuiProgressBar } from '@taiga-ui/kit';

import { FRENZY } from '@game/frenzy/config';
import type { PlayerBody, PlayerEffect, Stage } from '@game/frenzy/types';

import { getMood, type PokemonMood } from '../../../data/logic/pokemon-mood';
import { EFFECT_BADGE } from '../../../data/models/effect-badge';
import type { ReactionFace } from '../../../data/services/effects/reactive-mood-effect.service';
import { HpFlashDirective } from '../../directives/hp-flash.directive';
import { HpToneColorPipe } from '../../pipes/hp-tone-color.pipe';
import type { RenderedEffectBadge } from '../scene/scene-view-models';

// Juicy 3D mood faces (Microsoft Fluent Emoji, same set as the item sprites) keyed by mood; far more expressive
// than the flat Taiga line icons. Files live in public/frenzy/mood/<mood>.png.
const MOOD_SPRITE: Record<PokemonMood, string> = {
  happy: 'happy.png',
  content: 'content.png',
  hungry: 'hungry.png',
  starving: 'starving.png',
};

// Transient reaction faces (same Fluent set, same folder) that briefly override the mood face when something
// happens to my Pokémon — bomb hit, collision, poison eat, buff pickup.
const REACTION_SPRITE: Record<ReactionFace, string> = {
  hurt: 'hurt.png',
  dizzy: 'dizzy.png',
  bonk: 'bonk.png',
  sick: 'sick.png',
  pumped: 'pumped.png',
};

@Component({
  selector: 'left-paw-current-pokemon-status',
  imports: [
    HpFlashDirective,
    HpToneColorPipe,
    TranslocoDirective,
    TuiAvatar,
    TuiIcon,
    TuiProgressBar,
  ],
  templateUrl: './current-pokemon-status.component.html',
  styleUrl: './current-pokemon-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentPokemonStatusComponent {
  public readonly compact = input<boolean>(false);
  public readonly name = input.required<string>();
  public readonly hp = input.required<number>();
  public readonly stage = input.required<Stage>();
  // My Pokémon's per-stage descriptor — the next-evolution threshold reads off its hp gates (no global thresholds).
  public readonly body = input.required<PlayerBody>();
  // A transient reaction (bomb/collision/poison/buff) that briefly takes over the avatar face; null most of the time.
  public readonly reaction = input<ReactionFace | null>(null);
  // My Pokémon's currently-active timed effects (parent pre-filters by `expiresAt`); mirrored as a buff-chip strip.
  public readonly effects = input<readonly PlayerEffect[]>([]);
  // Active effects projected to display chips (icon + tone + kind) via the shared EFFECT_BADGE registry — the same
  // single source the over-head sprite badges read, so the card and scene never show a different icon/colour.
  protected readonly buffChips = computed<readonly RenderedEffectBadge[]>(() =>
    this.effects().map((effect) => ({ kind: effect.kind, ...EFFECT_BADGE[effect.kind] })),
  );
  // The bar uses one absolute scale (0 → hard ceiling); ticks mark BOTH evolution thresholds along it, and
  // `untilEvolution` is the HP still needed to reach the next one — the foot line vanishes on the final stage.
  protected readonly maxHp = FRENZY.maxHp;
  // Both evolution gates (stage-2 and stage-3 entry) as positions on the absolute bar, each flagged whether the
  // current HP has already passed it — so a single template loop draws a reached/upcoming notch for each.
  protected readonly stageMarks = computed<{ percent: number; reached: boolean }[]>(() => {
    const body = this.body();
    const hp = this.hp();

    return [body[2].hp, body[3].hp].map((gate) => ({
      percent: (gate / FRENZY.maxHp) * 100,
      reached: hp >= gate,
    }));
  });
  // The three stage zones painted as a hard-stop gradient behind the bar fill, split at the same gate positions
  // as the notches. Stops are data (per-player gates); the band colours are CSS vars set in the stylesheet.
  protected readonly zonesBackground = computed<string>(() => {
    const [first, second] = this.stageMarks();

    return (
      'linear-gradient(to right,' +
      ` var(--lp-zone-1) 0 ${first.percent}%,` +
      ` var(--lp-zone-2) ${first.percent}% ${second.percent}%,` +
      ` var(--lp-zone-3) ${second.percent}% 100%)`
    );
  });
  protected readonly mood = computed<PokemonMood>(() => getMood(this.hp(), this.stage()));
  // A live reaction wins over the hp-mood; otherwise the steady mood face shows.
  protected readonly moodSprite = computed<string>(() => {
    const reaction = this.reaction();
    const file = reaction !== null ? REACTION_SPRITE[reaction] : MOOD_SPRITE[this.mood()];

    return `/frenzy/mood/${file}`;
  });
  // i18n key for the avatar's aria-label — `reaction.<face>` while a reaction is live, else `mood.<mood>`.
  protected readonly faceLabelKey = computed<string>(() => {
    const reaction = this.reaction();

    return reaction !== null ? `reaction.${reaction}` : `mood.${this.mood()}`;
  });
  protected readonly nextThreshold = computed<number>(() => {
    const body = this.body();

    if (this.stage() === 1) {
      return body[2].hp;
    }

    if (this.stage() === 2) {
      return body[3].hp;
    }

    return FRENZY.maxHp;
  });
  protected readonly untilEvolution = computed<number | null>(() => {
    if (this.stage() === 3) {
      return null;
    }

    return this.nextThreshold() - this.hp();
  });
}
