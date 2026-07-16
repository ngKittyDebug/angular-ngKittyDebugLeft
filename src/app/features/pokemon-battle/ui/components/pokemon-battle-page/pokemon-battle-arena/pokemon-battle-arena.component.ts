import { ChangeDetectionStrategy, Component, DestroyRef, inject, viewChild } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import type { BattleEvent, BattlePokemon, PokemonMove } from '../../../../data/models/battle.model';
import { CanvasRendererComponent } from '../canvas-renderer/canvas-renderer.component';
import { PokemonBattleArenaFacade } from '../../../../data/facades/pokemon-battle-arena.facade';

@Component({
  selector: 'left-paw-pokemon-battle-arena',
  imports: [
    UpperCasePipe,
    TranslocoDirective,
    CanvasRendererComponent,
    TuiButton,
    TuiBadge,
    TuiScrollbar,
  ],
  providers: [PokemonBattleArenaFacade],
  templateUrl: './pokemon-battle-arena.component.html',
  styleUrl: './pokemon-battle-arena.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonBattleArenaComponent {
  private readonly canvasRenderer = viewChild(CanvasRendererComponent);

  public readonly facade = inject(PokemonBattleArenaFacade);

  constructor() {
    const destroyReference = inject(DestroyRef);

    this.facade.turnResolved$.pipe(takeUntilDestroyed(destroyReference)).subscribe((events) => {
      this.playEvents(events);
    });
  }

  public playEvents(events: BattleEvent[]): void {
    this.canvasRenderer()?.playEvents(events);
  }

  public onSelectMove(move: PokemonMove): void {
    this.facade.selectMove(move);
  }

  public onSelectTarget(target: BattlePokemon): void {
    this.facade.selectTarget(target);
  }

  public onCancelMoveSelection(): void {
    this.facade.cancelMoveSelection();
  }

  public onResetSelection(): void {
    this.facade.resetSelection();
  }

  public onResetBattle(): void {
    this.canvasRenderer()?.reset();
    this.facade.resetBattle();
  }

  public onGoBackToSelection(): void {
    this.canvasRenderer()?.reset();
    this.facade.goBackToSelection();
  }

  public onEventTriggered(event: BattleEvent): void {
    this.facade.triggerEvent(event);
  }

  public onAnimationFinished(): void {
    this.facade.finishAnimation();
  }
}
