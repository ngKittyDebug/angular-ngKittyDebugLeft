import type { ComponentRef, OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { TuiLoader } from '@taiga-ui/core';

import type { GameResult, MiniGameType } from '../../../models/mini-game.model';
import type { MiniGameComponent } from '../mini-game/mini-game.component';

@Component({
  selector: 'left-paw-mini-game-container',
  imports: [TuiLoader],
  templateUrl: './mini-game-container.component.html',
  styleUrl: './mini-game-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniGameContainerComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = viewChild('host', { read: ViewContainerRef });
  private componentRef: ComponentRef<MiniGameComponent> | null = null;
  private loadGeneration = 0;

  public readonly gameCompleted = output<GameResult>();
  public readonly gameType = input.required<MiniGameType>();

  protected readonly isLoading = signal(true);

  public constructor() {
    effect(() => {
      const gameType = this.gameType();

      void this.mountMiniGame(gameType);
    });
  }

  public ngOnDestroy(): void {
    this.destroyMiniGame();
  }

  private async mountMiniGame(gameType: MiniGameType): Promise<void> {
    const generation = ++this.loadGeneration;

    this.isLoading.set(true);

    const { MiniGameComponent: component } = await import('../mini-game/mini-game.component');

    if (generation !== this.loadGeneration) {
      return;
    }

    const container = this.host();

    if (!container) {
      return;
    }

    this.destroyMiniGame();

    const reference = container.createComponent(component);

    reference.setInput('gameType', gameType);

    const subscription = reference.instance.gameCompleted.subscribe((result: GameResult) => {
      this.gameCompleted.emit(result);
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });

    this.componentRef = reference;
    this.isLoading.set(false);
  }

  private destroyMiniGame(): void {
    this.componentRef?.destroy();
    this.componentRef = null;
    this.host()?.clear();
  }
}
