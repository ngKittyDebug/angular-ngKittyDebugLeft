import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { OnInit } from '@angular/core';

import { CurrentPokemonStatusComponent } from '../current-pokemon-status/current-pokemon-status.component';
import { FaintedModalComponent } from '../fainted-modal/fainted-modal.component';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { PokemonPickerComponent } from '../pokemon-picker/pokemon-picker.component';
import type { PickerSubmission } from '../pokemon-picker/pokemon-picker.component';
import { PresenceCounterComponent } from '../presence-counter/presence-counter.component';
import { SceneComponent } from '../scene/scene.component';
import type { ItemClick } from '../scene/scene.component';
import { SoundToggleComponent } from '../sound-toggle/sound-toggle.component';
import { FrenzyPageFacade } from './frenzy-page.facade';

@Component({
  selector: 'left-paw-frenzy-page',
  imports: [
    CurrentPokemonStatusComponent,
    FaintedModalComponent,
    LeaderboardComponent,
    PokemonPickerComponent,
    PresenceCounterComponent,
    SceneComponent,
    SoundToggleComponent,
  ],
  templateUrl: './frenzy-page.component.html',
  styleUrl: './frenzy-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrenzyPageComponent implements OnInit {
  protected readonly facade = inject(FrenzyPageFacade);

  protected readonly blasts = this.facade.blasts;
  protected readonly cooldownSeconds = this.facade.cooldownSeconds;
  protected readonly disconnectedCount = this.facade.disconnectedCount;
  protected readonly evolvingPlayers = this.facade.evolvingPlayers;
  protected readonly faintedStats = this.facade.faintedStats;
  protected readonly floatingMessages = this.facade.floatingMessages;
  protected readonly isMobile = this.facade.isMobile;
  protected readonly items = this.facade.items;
  protected readonly leaderboard = this.facade.leaderboard;
  protected readonly me = this.facade.me;
  protected readonly myId = this.facade.myId;
  protected readonly players = this.facade.players;
  protected readonly presenceCount = this.facade.presenceCount;
  protected readonly respawnReady = this.facade.respawnReady;
  protected readonly uiState = this.facade.uiState;

  public ngOnInit(): void {
    this.facade.connect();
  }

  protected handleChooseNew(): void {
    this.facade.chooseNew();
  }

  protected handleItemClick(event: ItemClick): void {
    this.facade.click(event);
  }

  protected handlePickerSubmit(payload: PickerSubmission): void {
    this.facade.join(payload);
  }

  protected handleRespawn(): void {
    this.facade.respawn();
  }

  protected handleSelfPoke(): void {
    this.facade.pokeSelf();
  }

  protected handleSteer(point: { x: number; y: number }): void {
    this.facade.steer(point);
  }
}
