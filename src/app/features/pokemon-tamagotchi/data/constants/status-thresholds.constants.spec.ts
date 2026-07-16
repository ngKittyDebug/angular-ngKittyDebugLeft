import { describe, expect, it } from 'vitest';
import { STATUS_THRESHOLDS } from './status-thresholds.constants';

describe('STATUS_THRESHOLDS', () => {
  describe('Edge Cases', () => {
    it('должен задавать warning выше critical для энергии', () => {
      expect(STATUS_THRESHOLDS.energyWarning).toBeGreaterThan(STATUS_THRESHOLDS.energyCritical);
    });
  });
});
