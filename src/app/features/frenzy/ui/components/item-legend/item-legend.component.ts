import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon } from '@taiga-ui/core';

import type { ItemType } from '@game/frenzy/types';

import { PlayerPersistenceService } from '../../../data/services/player-persistence.service';
import { ITEM_DOT_COLOR } from '../../constants/pokemon-registry';
import { ItemSpritePipe } from '../../pipes/item-sprite.pipe';

type GroupKey = 'good' | 'risky' | 'bad';

interface LegendEntry {
  type: ItemType;
  color: string;
}

interface LegendGroup {
  key: GroupKey;
  entries: readonly LegendEntry[];
}

// EVERY item type maps to a legend group — this is a `Record<ItemType, …>`, so adding a new `ItemType` to the
// contract without classifying it here is a COMPILE error. Keep it that way: the legend must list every droppable.
// Insertion order within a group is the display order. Grouped by what eating it does: `good` heals/buffs,
// `risky` is a wildcard (mushroom gamble; easter egg = heal 0 but sprays random items, incl. bombs), `bad` damages
// (poop also curses you into spraying junk).
const ITEM_GROUP: Record<ItemType, GroupKey> = {
  food: 'good',
  crumb: 'good',
  goldenBerry: 'good',
  rareCandy: 'good',
  vitamin: 'good',
  shield: 'good',
  cactus: 'good',
  mushroom: 'risky',
  easterEgg: 'risky',
  rotten: 'bad',
  rock: 'bad',
  brick: 'bad',
  bomb: 'bad',
  poop: 'bad',
};

const GROUP_ORDER: readonly GroupKey[] = ['good', 'risky', 'bad'];

// Built from ITEM_GROUP so the source of truth stays the exhaustive record. The swatch colour matches the minimap
// dot so the legend doubles as the key for the minimap's coloured blips; item names resolve from i18n.
const LEGEND_GROUPS: readonly LegendGroup[] = GROUP_ORDER.map((key) => ({
  key,
  entries: (Object.keys(ITEM_GROUP) as ItemType[])
    .filter((type) => ITEM_GROUP[type] === key)
    .map((type) => ({ type, color: ITEM_DOT_COLOR[type] })),
}));

@Component({
  selector: 'left-paw-item-legend',
  imports: [ItemSpritePipe, TranslocoDirective, TuiIcon],
  templateUrl: './item-legend.component.html',
  styleUrl: './item-legend.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A click anywhere on the open panel collapses it (a big, forgiving close target); a click OUTSIDE the widget
  // closes it too. The toggle buttons stopPropagation, so opening from the pill never reaches either handler.
  host: {
    '(click)': 'collapseIfOpen()',
    '(document:click)': 'collapseOnOutsideClick($event)',
  },
})
export class ItemLegendComponent {
  private readonly persistence = inject(PlayerPersistenceService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  public readonly compact = input<boolean>(false);

  protected readonly groups = LEGEND_GROUPS;

  // Restore the saved open/closed state; with none saved, default to collapsed on mobile and expanded on
  // desktop (mirrors the minimap). A manual toggle persists and thereafter wins over the responsive default.
  protected readonly collapsed = linkedSignal<boolean>(
    () => this.persistence.getLegendCollapsed() ?? this.compact(),
  );

  protected toggle(event: Event): void {
    // Keep the button's click from bubbling to the host `collapseIfOpen` — otherwise opening from the pill would
    // immediately bubble up and close again.
    event.stopPropagation();
    this.collapsed.update((value) => !value);
    this.persistence.saveLegendCollapsed(this.collapsed());
  }

  protected collapseIfOpen(): void {
    if (this.collapsed()) {
      return;
    }

    this.collapsed.set(true);
    this.persistence.saveLegendCollapsed(true);
  }

  protected collapseOnOutsideClick(event: Event): void {
    if (this.collapsed() || this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.collapsed.set(true);
    this.persistence.saveLegendCollapsed(true);
  }
}
