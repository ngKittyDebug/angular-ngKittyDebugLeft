export type StatusType = 'health' | 'hunger' | 'mood' | 'energy' | 'hydration' | 'experience';

export interface PokemonStatusModel {
  health: number;
  hunger: number;
  mood: number;
  energy: number;
  hydration: number;
  experience: number;
  level: number;
  lastCareTime: number | null;
  lastFeedTime: number | null;
  lastTrainTime: number | null;
  lastPlayTime: number | null;
  lastSleepTime: number | null;
  lastHydrationTime: number | null;
  lastSaveTime: number | null;
}

export interface StatusThresholdsModel {
  healthWarning: number;
  hungerWarning: number;
  moodWarning: number;
  energyWarning: number;
  hydrationWarning: number;
  healthCritical: number;
  hungerCritical: number;
  moodCritical: number;
  energyCritical: number;
  hydrationCritical: number;
}

export interface StatusDecayModel {
  hunger: number;
  mood: number;
  energy: number;
  hydration: number;
  timestamp: number;
}

export interface StatusUpdateModel {
  health?: number;
  hunger?: number;
  mood?: number;
  energy?: number;
  hydration?: number;
  experience?: number;
  level?: number;
}
