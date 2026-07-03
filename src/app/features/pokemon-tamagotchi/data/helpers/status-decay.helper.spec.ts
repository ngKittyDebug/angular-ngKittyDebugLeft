import { describe, expect, it } from 'vitest';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { detectPeriodicCriticalAlerts, detectStatusAlerts } from './status-decay.helper';
import { createInitialPokemonStatus } from '../store/tamagotchi-initial';

describe('status-decay.helper alerts', () => {
  it('should alert when hunger crosses warning threshold', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hunger: STATUS_THRESHOLDS.hungerWarning + 1,
    };
    const after = {
      ...before,
      hunger: STATUS_THRESHOLDS.hungerWarning,
    };

    expect(detectStatusAlerts(before, after)).toContain('hungerLow');
  });

  it('should alert on further hunger decrease by one while in warning zone', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hunger: STATUS_THRESHOLDS.hungerWarning,
    };
    const after = {
      ...before,
      hunger: STATUS_THRESHOLDS.hungerWarning - 1,
    };

    expect(detectStatusAlerts(before, after)).toContain('hungerLow');
  });

  it('should not alert when hunger drops by more than one in warning zone', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hunger: STATUS_THRESHOLDS.hungerWarning,
    };
    const after = {
      ...before,
      hunger: STATUS_THRESHOLDS.hungerWarning - 3,
    };

    expect(detectStatusAlerts(before, after)).toEqual([]);
  });

  it('should not alert on fractional decrease within the same integer step', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hydration: 10.8,
    };
    const after = {
      ...before,
      hydration: 10.2,
    };

    expect(detectStatusAlerts(before, after)).toEqual([]);
  });

  it('should alert when fractional decrease crosses the next integer in critical zone', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hydration: 10.2,
    };
    const after = {
      ...before,
      hydration: 9.8,
    };

    expect(detectStatusAlerts(before, after)).toEqual(['hydrationCritical']);
  });

  it('should not alert when hunger decreases but stays above warning threshold', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hunger: STATUS_THRESHOLDS.hungerWarning + 10,
    };
    const after = {
      ...before,
      hunger: STATUS_THRESHOLDS.hungerWarning + 5,
    };

    expect(detectStatusAlerts(before, after)).toEqual([]);
  });

  it('should alert when hydration crosses critical threshold', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hydration: STATUS_THRESHOLDS.hydrationCritical + 1,
    };
    const after = {
      ...before,
      hydration: STATUS_THRESHOLDS.hydrationCritical,
    };

    expect(detectStatusAlerts(before, after)).toContain('hydrationCritical');
  });

  it('should prefer critical alert over warning when crossing into critical zone', () => {
    const before = {
      ...createInitialPokemonStatus(),
      mood: STATUS_THRESHOLDS.moodCritical + 1,
    };
    const after = {
      ...before,
      mood: STATUS_THRESHOLDS.moodCritical,
    };

    expect(detectStatusAlerts(before, after)).toEqual(['moodCritical']);
  });

  it('should alert when critical stat decreases by one while staying critical', () => {
    const before = {
      ...createInitialPokemonStatus(),
      hydration: STATUS_THRESHOLDS.hydrationCritical,
    };
    const after = {
      ...before,
      hydration: STATUS_THRESHOLDS.hydrationCritical - 1,
    };

    expect(detectStatusAlerts(before, after)).toEqual(['hydrationCritical']);
  });

  it('should repeat critical alerts every 15 minutes while stat stays critical', () => {
    const status = {
      ...createInitialPokemonStatus(),
      energy: STATUS_THRESHOLDS.energyCritical,
    };
    const now = 1_000_000;

    expect(
      detectPeriodicCriticalAlerts(
        status,
        { energyCritical: now - TIMER_CONFIG.CRITICAL_ALERT_REPEAT_MS },
        now,
      ),
    ).toContain('energyCritical');
  });

  it('should not repeat critical alerts before 15 minutes elapsed', () => {
    const status = {
      ...createInitialPokemonStatus(),
      energy: STATUS_THRESHOLDS.energyCritical,
    };
    const now = 1_000_000;

    expect(
      detectPeriodicCriticalAlerts(
        status,
        { energyCritical: now - TIMER_CONFIG.CRITICAL_ALERT_REPEAT_MS + 1_000 },
        now,
      ),
    ).toEqual([]);
  });
});
