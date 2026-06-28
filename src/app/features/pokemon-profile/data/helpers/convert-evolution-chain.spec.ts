import { convertEvolutionChainToNodeModel } from './convert-evolution-chain';
import type { EvolutionChainItemApiData } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import { POKEMON_EVOLUTION_CHAIN_FIXTURE } from '@shared/fixtures/eevee-evolution-chain.fixture';

describe('convertEvolutionChainToNodeModel', () => {
  it('должен инициализироваться', () => {
    expect(convertEvolutionChainToNodeModel).toBeTruthy();
  });

  describe('Валидация входных данных', () => {
    it('должен возвращать null, если узел пустой или отсутствует species', () => {
      expect(convertEvolutionChainToNodeModel(null)).toBeNull();
      expect(convertEvolutionChainToNodeModel(undefined)).toBeNull();
      expect(
        convertEvolutionChainToNodeModel({
          species: null!,
        } as unknown as EvolutionChainItemApiData),
      ).toBeNull();
    });
  });

  describe('Определение условий (condition) на основе реальных данных', () => {
    it('должен возвращать имя триггера, если min_level отсутствует', () => {
      const vaporeonNode = POKEMON_EVOLUTION_CHAIN_FIXTURE.chain
        .evolves_to[0] as unknown as EvolutionChainItemApiData;

      const result = convertEvolutionChainToNodeModel(vaporeonNode);

      expect(result?.condition).toBe('use-item');
    });

    it('должен возвращать Lv. с уровнем, если указан min_level', () => {
      const mockNode = {
        species: { name: 'eevee' },
        evolution_details: [{ min_level: 25, trigger: { name: 'level-up' } }],
        evolves_to: [],
      } as unknown as EvolutionChainItemApiData;

      const result = convertEvolutionChainToNodeModel(mockNode);

      expect(result?.condition).toBe('Lv. 25');
    });

    it('должен возвращать null, если деталей эволюции нет', () => {
      const rootNode = {
        ...POKEMON_EVOLUTION_CHAIN_FIXTURE.chain,
        species: { name: 'eevee' },
      } as unknown as EvolutionChainItemApiData;

      const result = convertEvolutionChainToNodeModel(rootNode);

      expect(result?.condition).toBeNull();
    });
  });

  describe('Обработка вложенных узлов (children)', () => {
    it('должен рекурсивно собирать дерево со всеми вложенными эволюциями из фикстуры', () => {
      const rootNode = {
        ...POKEMON_EVOLUTION_CHAIN_FIXTURE.chain,
        species: { name: 'eevee' },
      } as unknown as EvolutionChainItemApiData;

      const result = convertEvolutionChainToNodeModel(rootNode);

      expect(result?.name).toBe('eevee');
      expect(result?.condition).toBeNull();
      expect(result?.children).toHaveLength(8);

      expect(result?.children[0]).toEqual({
        name: 'vaporeon',
        condition: 'use-item',
        children: [],
      });

      expect(result?.children[3]).toEqual({
        name: 'espeon',
        condition: 'level-up',
        children: [],
      });
    });

    it('должен исключать невалидные дочерние элементы из итогового массива', () => {
      const mockNode = {
        species: { name: 'eevee' },
        evolution_details: [],
        evolves_to: [
          null!,
          {
            species: { name: 'vaporeon' },
            evolution_details: [{ trigger: { name: 'use-item' } }],
            evolves_to: [],
          },
        ],
      } as unknown as EvolutionChainItemApiData;

      const result = convertEvolutionChainToNodeModel(mockNode);

      expect(result?.children).toHaveLength(1);
      expect(result?.children[0].name).toBe('vaporeon');
    });
  });
});
