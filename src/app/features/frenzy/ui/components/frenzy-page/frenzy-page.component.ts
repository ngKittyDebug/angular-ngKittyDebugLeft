import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { OnInit } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { CurrentPokemonStatusComponent } from '../current-pokemon-status/current-pokemon-status.component';
import { DisconnectedModalComponent } from '../disconnected-modal/disconnected-modal.component';
import { FaintedModalComponent } from '../fainted-modal/fainted-modal.component';
import { ItemLegendComponent } from '../item-legend/item-legend.component';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { MinimapComponent } from '../minimap/minimap.component';
import { PokemonPickerComponent } from '../pokemon-picker/pokemon-picker.component';
import type { PickerSubmission } from '../pokemon-picker/pokemon-picker.component';
import { SceneComponent } from '../scene/scene.component';
import type { ItemClick } from '../scene/scene-view-models';
import { SoundToggleComponent } from '../sound-toggle/sound-toggle.component';
import { FrenzyPageFacade } from './frenzy-page.facade';

@Component({
  selector: 'left-paw-frenzy-page',
  imports: [
    CurrentPokemonStatusComponent,
    DisconnectedModalComponent,
    FaintedModalComponent,
    ItemLegendComponent,
    LeaderboardComponent,
    MinimapComponent,
    PokemonPickerComponent,
    SceneComponent,
    SoundToggleComponent,
    TranslocoDirective,
  ],
  templateUrl: './frenzy-page.component.html',
  styleUrl: './frenzy-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrenzyPageComponent implements OnInit {
  protected readonly facade = inject(FrenzyPageFacade);

  protected readonly blastList = this.facade.blastList;
  protected readonly cooldownSeconds = this.facade.cooldownSeconds;
  protected readonly disconnectedCount = this.facade.disconnectedCount;
  protected readonly evolvingPlayers = this.facade.evolvingPlayers;
  protected readonly hitBurstList = this.facade.hitBurstList;
  protected readonly ownedSparkList = this.facade.ownedSparkList;
  protected readonly ownedShieldBlockList = this.facade.ownedShieldBlockList;
  protected readonly faintedStats = this.facade.faintedStats;
  protected readonly faintedEpitaph = this.facade.faintedEpitaph;
  protected readonly orphanFloatList = this.facade.orphanFloatList;
  protected readonly ownedFloatList = this.facade.ownedFloatList;
  protected readonly joinError = this.facade.joinError;
  protected readonly isMobile = this.facade.isMobile;
  protected readonly itemList = this.facade.itemList;
  protected readonly leader = this.facade.leader;
  protected readonly leaderboardList = this.facade.leaderboardList;
  protected readonly crownId = this.facade.crownId;
  protected readonly me = this.facade.me;
  protected readonly activeEffectList = this.facade.activeEffectList;
  protected readonly myId = this.facade.myId;
  protected readonly playerList = this.facade.playerList;
  protected readonly presenceCount = this.facade.presenceCount;
  protected readonly savedName = this.facade.savedName;
  protected readonly savedAppearance = this.facade.savedAppearance;
  protected readonly reactionFace = this.facade.reactionFace;
  protected readonly respawnReady = this.facade.respawnReady;
  protected readonly isReconnecting = this.facade.isReconnecting;
  protected readonly uiState = this.facade.uiState;

  public ngOnInit(): void {
    this.facade.connect();
  }

  protected onChooseNew(): void {
    this.facade.chooseNew();
  }

  protected onItemClick(event: ItemClick): void {
    this.facade.click(event);
  }

  protected onPickerSubmit(payload: PickerSubmission): void {
    this.facade.join(payload);
  }

  protected onRespawn(): void {
    this.facade.respawn();
  }

  protected onSelfPoke(): void {
    this.facade.pokeSelf();
  }

  protected onPokeNpc(npcId: string): void {
    this.facade.pokeNpc(npcId);
  }

  protected onSteer(point: { x: number; y: number }): void {
    this.facade.steer(point);
  }
}
