export type StatusType = 'health' | 'hunger' | 'mood' | 'energy' | 'hydration' | 'experience';

export interface PokemonStatus {
  health: number;
  hunger: number;
  mood: number;
  energy: number;
  hydration: number;
  experience: number;
  level: number;
  lastFeedTime: number | null;
  lastPlayTime: number | null;
  lastSleepTime: number | null;
  lastHydrationTime: number | null;
  lastSaveTime: number | null;
}

export interface StatusThresholds {
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

export interface StatusDecay {
  hunger: number;
  mood: number;
  energy: number;
  hydration: number;
  timestamp: number;
}

export interface StatusUpdate {
  health?: number;
  hunger?: number;
  mood?: number;
  energy?: number;
  hydration?: number;
  experience?: number;
  level?: number;
}
