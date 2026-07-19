export const TAMAGOTCHI_SYSTEM_ERRORS = {
  EVOLUTION_PREPARE_FAILED: 'Failed to prepare evolution',
  LOAD_FAILED: 'Failed to load tamagotchi state',
  RECOVERED_FROM_BACKUP: 'State recovered from backup',
  SAVE_FAILED: 'Failed to save tamagotchi state',
} as const;

export type TamagotchiSystemError =
  (typeof TAMAGOTCHI_SYSTEM_ERRORS)[keyof typeof TAMAGOTCHI_SYSTEM_ERRORS];
