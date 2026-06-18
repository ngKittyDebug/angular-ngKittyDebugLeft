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

  protected readonly blasts = this.facade.blasts;
  protected readonly cooldownSeconds = this.facade.cooldownSeconds;
  protected readonly disconnectedCount = this.facade.disconnectedCount;
  protected readonly evolvingPlayers = this.facade.evolvingPlayers;
  protected readonly hitBursts = this.facade.hitBursts;
  protected readonly ownedSparks = this.facade.ownedSparks;
  protected readonly ownedShieldBlocks = this.facade.ownedShieldBlocks;
  protected readonly faintedStats = this.facade.faintedStats;
  protected readonly faintedEpitaph = this.facade.faintedEpitaph;
  protected readonly orphanFloats = this.facade.orphanFloats;
  protected readonly ownedFloats = this.facade.ownedFloats;
  protected readonly joinError = this.facade.joinError;
  protected readonly isMobile = this.facade.isMobile;
  protected readonly items = this.facade.items;
  protected readonly leader = this.facade.leader;
  protected readonly leaderboard = this.facade.leaderboard;
  protected readonly crownId = this.facade.crownId;
  protected readonly me = this.facade.me;
  protected readonly activeEffects = this.facade.activeEffects;
  protected readonly myId = this.facade.myId;
  protected readonly players = this.facade.players;
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

  protected handlePokeNpc(npcId: string): void {
    this.facade.pokeNpc(npcId);
  }

  protected handleSteer(point: { x: number; y: number }): void {
    this.facade.steer(point);
  }
}
