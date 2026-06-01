/**
 * Основной ответ API: evolution-chain/{id}
 */
export interface EvolutionChainResponse {
  /** ID цепочки (не всегда совпадает с ID покемона) */
  id: number;

  /** Предмет, необходимый для вылупления baby-покемона (если есть) */
  baby_trigger_item: NamedAPIResource | null;

  /** Корневой узел эволюции (например, Eevee) */
  chain: EvolutionNode;
}

/**
 * Рекурсивный узел эволюции
 * Описывает одного покемона и его возможные пути развития
 */
export interface EvolutionNode {
  /** Является ли эта форма 'baby' (например, Pichu, Riolu) */
  is_baby: boolean;

  /** Основная информация о виде покемона */
  species: NamedAPIResource;

  /**
   * Массив условий эволюции.
   * ВАЖНО: Для Eevee здесь может быть несколько объектов,
   * если условия различаются в разных версиях игр.
   */
  evolution_details: EvolutionDetail[];

  /**
   * Список следующих форм эволюции.
   * Если массив пуст — эволюций больше нет (конечная форма).
   */
  evolves_to: EvolutionNode[];
}

/**
 * Детальное описание условия эволюции
 * Содержит все возможные поля, которые могут встретиться в API
 */
export interface EvolutionDetail {
  /** Триггер: 'level-up', 'use-item', 'trade', 'shed' и т.д. */
  trigger: NamedAPIResource;

  /** Минимальный уровень (если trigger = level-up) */
  min_level: number | null;

  /** Необходимый предмет (если trigger = use-item или trade) */
  item: NamedAPIResource | null;

  /** Пол покемона (1 = Male, 2 = Female, null = любой) */
  gender: number | null;

  /** Время суток ('day', 'night') */
  time_of_day: string | null;

  /** Уровень дружбы (happiness) */
  min_happiness: number | null;

  /** Уровень привязанности (affection, для Gen 6+) */
  min_affection: number | null;

  /** Необходимая красота (beauty, для Gen 3-5) */
  min_beauty: number | null;

  /** Знание определенной атаки */
  known_move: NamedAPIResource | null;

  /** Тип необходимой атаки */
  known_move_type: NamedAPIResource | null;

  /** Местоположение (например, 'mt-coronet') */
  location: NamedAPIResource | null;

  /** Необходимость дождя в оверворлде (для Castform и др.) */
  needs_overworld_rain: boolean;

  /** Наличие определенного покемона в партии */
  party_species: NamedAPIResource | null;

  /** Тип покемона в партии */
  party_type: NamedAPIResource | null;

  /**
   * Соотношение физических статов (для Tyrogue):
   * 1 = Atk > Def
   * -1 = Def > Atk
   * 0 = Atk = Def
   */
  relative_physical_stats: number | null;

  /** Покемон, с которым нужно обменяться (для Huntail/Gorebyss) */
  trade_species: NamedAPIResource | null;

  /** Необходимо перевернуть консоль (для Inkay) */
  turn_upside_down: boolean;
}

/**
 * Стандартная структура PokéAPI для ссылок (Name + URL)
 */
export interface NamedAPIResource {
  name: string;
  url: string;
}
