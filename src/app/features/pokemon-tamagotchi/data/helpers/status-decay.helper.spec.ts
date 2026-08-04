import { describe, expect, it } from 'vitest';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { detectPeriodicCriticalAlerts, detectStatusAlerts } from './status-decay.helper';
import { createInitialPokemonStatus } from '../store/tamagotchi-initial';

describe('status-decay.helper', () => {
  describe('Happy Path', () => {
    it('должен алертить, когда голод пересекает warning-порог', () => {
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

    it('не должен повторять threshold alert при дальнейшем снижении в warning-зоне', () => {
      const before = {
        ...createInitialPokemonStatus(),
        hunger: STATUS_THRESHOLDS.hungerWarning,
      };
      const after = {
        ...before,
        hunger: STATUS_THRESHOLDS.hungerWarning - 1,
      };

      expect(detectStatusAlerts(before, after)).toEqual([]);
    });

    it('должен алертить, когда offline decay пересекает warning-порог за один тик', () => {
      const before = {
        ...createInitialPokemonStatus(),
        hunger: STATUS_THRESHOLDS.hungerWarning + 10,
      };
      const after = {
        ...before,
        hunger: STATUS_THRESHOLDS.hungerWarning - 3,
      };

      expect(detectStatusAlerts(before, after)).toEqual(['hungerLow']);
    });

    it('должен алертить critical, когда offline decay пересекает warning и critical за один тик', () => {
      const before = {
        ...createInitialPokemonStatus(),
        energy: STATUS_THRESHOLDS.energyWarning + 10,
      };
      const after = {
        ...before,
        energy: STATUS_THRESHOLDS.energyCritical - 1,
      };

      expect(detectStatusAlerts(before, after)).toEqual(['energyCritical']);
    });

    it('должен алертить, когда гидратация пересекает critical-порог', () => {
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

    it('должен предпочитать critical-алерт warning при входе в critical-зону', () => {
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

    it('не должен повторять threshold alert при снижении внутри critical-зоны', () => {
      const before = {
        ...createInitialPokemonStatus(),
        hydration: STATUS_THRESHOLDS.hydrationCritical,
      };
      const after = {
        ...before,
        hydration: STATUS_THRESHOLDS.hydrationCritical - 1,
      };

      expect(detectStatusAlerts(before, after)).toEqual([]);
    });

    it('должен повторять critical-алерты каждые 15 минут, пока стат остаётся critical', () => {
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
  });

  describe('Edge Cases', () => {
    it('должен не алертить, когда голод остаётся в warning-зоне после большого падения', () => {
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

    it('должен не алертить при дробном снижении в пределах одного целого шага', () => {
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

    it('должен алертить, когда дробное снижение пересекает следующее целое в critical-зоне', () => {
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

    it('должен не алертить, когда голод снижается, но остаётся выше warning-порога', () => {
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

    it('должен не повторять critical-алерты раньше чем через 15 минут', () => {
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
});
