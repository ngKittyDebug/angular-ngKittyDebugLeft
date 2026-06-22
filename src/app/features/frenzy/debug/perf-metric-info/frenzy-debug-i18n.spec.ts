import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import enJson from '../../../../../../public/i18n/frenzy-debug/en.json';
// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import ruJson from '../../../../../../public/i18n/frenzy-debug/ru.json';
import { PERF_METRIC_KEYS } from '../debug-settings.store';

const SECTIONS = ['what', 'why', 'interpret'] as const;
const METRIC_FIELDS = ['label', 'name', 'what', 'why', 'interpret'] as const;

const FILES: readonly { language: string; json: Record<string, unknown> }[] = [
  { language: 'en', json: enJson as Record<string, unknown> },
  { language: 'ru', json: ruJson as Record<string, unknown> },
];

function nonEmpty(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

describe('frenzy-debug i18n scope', () => {
  for (const { language, json } of FILES) {
    describe(language, () => {
      it('has the info aria-label and the section subheadings', () => {
        expect(nonEmpty(json['infoAriaLabel'])).toBe(true);
        expect(json['infoAriaLabel']).toContain('{{metric}}');

        const sections = json['sections'] as Record<string, unknown>;

        for (const section of SECTIONS) {
          expect(nonEmpty(sections?.[section]), `sections.${section} in ${language}`).toBe(true);
        }
      });

      it('describes every perf metric (label + what/why/interpret)', () => {
        const metrics = json['metrics'] as Record<string, Record<string, unknown>>;

        for (const key of PERF_METRIC_KEYS) {
          expect(metrics?.[key], `missing metrics.${key} in ${language}`).toBeTruthy();

          for (const field of METRIC_FIELDS) {
            expect(nonEmpty(metrics[key]?.[field]), `metrics.${key}.${field} in ${language}`).toBe(
              true,
            );
          }
        }
      });
    });
  }
});
