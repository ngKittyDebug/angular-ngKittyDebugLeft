import type { StatusThresholds } from '../../models/pokemon-status.model';

export const STATUS_THRESHOLDS: StatusThresholds = {
  healthWarning: 30,
  hungerWarning: 30,
  moodWarning: 30,
  energyWarning: 20,
  hydrationWarning: 25,
  healthCritical: 15,
  hungerCritical: 15,
  moodCritical: 15,
  energyCritical: 10,
  hydrationCritical: 10,
};
