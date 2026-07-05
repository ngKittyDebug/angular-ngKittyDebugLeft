import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it } from 'vitest';
import { PokemonTamagotchiSelectionComponent } from './pokemon-tamagotchi-selection.component';

describe('PokemonTamagotchiSelectionComponent', () => {
  let fixture: ComponentFixture<PokemonTamagotchiSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PokemonTamagotchiSelectionComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              pokemonProfile: {
                tamagotchiSelection: {
                  alreadySelected: 'Selected for Tamagotchi',
                  evolvedPokemonError: 'Only first-stage Pokémon can join.',
                  loadFailedError: 'Could not prepare this Pokémon.',
                  openTamagotchi: 'Open Tamagotchi',
                  savedMessage: '{{name}} is ready!',
                  selectButton: 'Use in Tamagotchi',
                },
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonTamagotchiSelectionComponent);
    fixture.componentRef.setInput('pokemonName', 'Pikachu');
    fixture.componentRef.setInput('tamagotchiRoute', '/tamagotchi');
    fixture.detectChanges();
  });

  it('renders select button when not current selection', () => {
    const button = fixture.nativeElement.querySelector('button');

    expect(button?.textContent?.trim()).toBe('Use in Tamagotchi');
    expect(button?.disabled).toBe(false);
  });

  it('disables select button when already selected', () => {
    fixture.componentRef.setInput('isCurrentSelection', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');

    expect(button?.textContent?.trim()).toBe('Selected for Tamagotchi');
    expect(button?.disabled).toBe(true);
  });

  it('shows open tamagotchi link when current selection', () => {
    fixture.componentRef.setInput('isCurrentSelection', true);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a');

    expect(link?.textContent?.trim()).toBe('Open Tamagotchi');
  });
});
