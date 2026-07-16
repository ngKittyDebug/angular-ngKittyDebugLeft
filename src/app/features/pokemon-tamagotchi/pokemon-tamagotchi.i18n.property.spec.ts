import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import enTranslations from '../../../../public/i18n/pokemonTamagotchi/en.json';
// eslint-disable-next-line import/extensions -- JSON fixtures must be imported with their extension.
import ruTranslations from '../../../../public/i18n/pokemonTamagotchi/ru.json';

function collectTranslationKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return collectTranslationKeys(nested, path);
    }

    return [path];
  });
}

function loadLocaleKeys(language: 'en' | 'ru'): string[] {
  const parsed = language === 'en' ? enTranslations : ruTranslations;

  return collectTranslationKeys(parsed).sort();
}

describe('pokemon-tamagotchi i18n', () => {
  describe('Happy Path', () => {
    describe('Property 14: согласованность интернационализации', () => {
      it('должен сохранять совпадающие ключи переводов между английской и русской локалями', () => {
        const englishKeys = loadLocaleKeys('en');
        const russianKeys = loadLocaleKeys('ru');

        expect(englishKeys).toEqual(russianKeys);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Property 14: согласованность интернационализации', () => {
      it('должен иметь непустой набор ключей в каждой локали', () => {
        expect(loadLocaleKeys('en').length).toBeGreaterThan(0);
        expect(loadLocaleKeys('ru').length).toBeGreaterThan(0);
      });
    });
  });
});
