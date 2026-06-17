import { ChangeDetectionStrategy, Component } from '@angular/core';

// Eight shards radiating in 45° steps — a cartoon "bonk" star. Count is fixed; per-shard angle/size/timing is CSS.
const SHARDS = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * One-shot cartoon impact sparks — a starburst of gold shards plus a central flash, shown over a Pokémon that a
 * falling rock/brick just bonked on the head. Purely decorative (`aria-hidden`, `pointer-events: none`); the parent
 * (`ScenePlayerComponent`) nests it above the sprite and removes the instance after the animation ends.
 */
@Component({
  selector: 'left-paw-spark-burst',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './spark-burst.component.html',
  styleUrl: './spark-burst.component.scss',
})
export class SparkBurstComponent {
  protected readonly shards = SHARDS;
}
