# Описание полей PokeAPI

Документ описывает все поля, используемые в интерфейсах проекта. Данные берутся из [PokeAPI v2](https://pokeapi.co/docs/v2).

## Эндпоинт: GET /api/v2/pokemon (список)

| Поле             | Тип              | Описание                               |
| ---------------- | ---------------- | -------------------------------------- |
| `count`          | `number`         | Общее количество покемонов в базе      |
| `next`           | `string \| null` | URL следующей страницы пагинации       |
| `previous`       | `string \| null` | URL предыдущей страницы пагинации      |
| `results`        | `array`          | Массив покемонов на текущей странице   |
| `results[].name` | `string`         | Имя покемона (латиница, lowercase)     |
| `results[].url`  | `string`         | URL для получения детальной информации |

---

## Эндпоинт: GET /api/v2/pokemon/{id} (детали)

### Основные поля

| Поле                       | Тип       | Описание                                              |
| -------------------------- | --------- | ----------------------------------------------------- |
| `id`                       | `number`  | Уникальный идентификатор покемона                     |
| `name`                     | `string`  | Имя покемона (латиница, lowercase)                    |
| `base_experience`          | `number`  | Базовый опыт, получаемый за победу над этим покемоном |
| `height`                   | `number`  | Рост покемона в дециметрах                            |
| `weight`                   | `number`  | Вес покемона в гектограммах                           |
| `is_default`               | `boolean` | Является ли это формой по умолчанию                   |
| `order`                    | `number`  | Порядковый номер для сортировки (учитывает формы)     |
| `location_area_encounters` | `string`  | URL для получения списка мест обитания                |

### abilities (способности)

| Поле                       | Тип       | Описание                              |
| -------------------------- | --------- | ------------------------------------- |
| `abilities[].ability.name` | `string`  | Название способности                  |
| `abilities[].ability.url`  | `string`  | URL с детальным описанием способности |
| `abilities[].is_hidden`    | `boolean` | Является ли способность скрытой       |
| `abilities[].slot`         | `number`  | Порядковый номер слота способности    |

### types (типы)

| Поле                | Тип      | Описание                                                  |
| ------------------- | -------- | --------------------------------------------------------- |
| `types[].slot`      | `number` | Порядковый номер слота типа (1 — основной, 2 — вторичный) |
| `types[].type.name` | `string` | Название типа (fire, water, grass и т.д.)                 |
| `types[].type.url`  | `string` | URL с детальным описанием типа                            |

### stats (характеристики)

| Поле                | Тип      | Описание                                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------------------- |
| `stats[].base_stat` | `number` | Базовое значение характеристики                                                       |
| `stats[].effort`    | `number` | Очки усилий (EV), получаемые за победу                                                |
| `stats[].stat.name` | `string` | Название характеристики (hp, attack, defense, special-attack, special-defense, speed) |
| `stats[].stat.url`  | `string` | URL с детальным описанием характеристики                                              |

### moves (приёмы)

| Поле                                                     | Тип      | Описание                                         |
| -------------------------------------------------------- | -------- | ------------------------------------------------ |
| `moves[].move.name`                                      | `string` | Название приёма                                  |
| `moves[].move.url`                                       | `string` | URL с детальным описанием приёма                 |
| `moves[].version_group_details[]`                        | `array`  | В каких версиях игры и как изучается приём       |
| `moves[].version_group_details[].level_learned_at`       | `number` | Уровень, на котором изучается (0 — не по уровню) |
| `moves[].version_group_details[].move_learn_method.name` | `string` | Способ изучения (level-up, machine, egg, tutor)  |
| `moves[].version_group_details[].version_group.name`     | `string` | Группа версий игры                               |

### sprites (изображения)

| Поле                                              | Тип                                         | Описание                                                                               |
| ------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `sprites.front_default`                           | `string \| null`                            | Стандартный спрайт (вид спереди)                                                       |
| `sprites.front_shiny`                             | `string \| null`                            | Шайни-спрайт (вид спереди)                                                             |
| `sprites.front_female`                            | `string \| null`                            | Спрайт самки (вид спереди)                                                             |
| `sprites.front_shiny_female`                      | `string \| null`                            | Шайни-спрайт самки (вид спереди)                                                       |
| `sprites.back_default`                            | `string \| null`                            | Стандартный спрайт (вид сзади)                                                         |
| `sprites.back_shiny`                              | `string \| null`                            | Шайни-спрайт (вид сзади)                                                               |
| `sprites.back_female`                             | `string \| null`                            | Спрайт самки (вид сзади)                                                               |
| `sprites.back_shiny_female`                       | `string \| null`                            | Шайни-спрайт самки (вид сзади)                                                         |
| `sprites.other.dream_world.front_default`         | `string \| null`                            | Спрайт из Dream World (SVG)                                                            |
| `sprites.other.dream_world.front_female`          | `string \| null`                            | Спрайт самки из Dream World                                                            |
| `sprites.other.home`                              | `object`                                    | Спрайты из Pokemon HOME (front_default, front_shiny, front_female, front_shiny_female) |
| `sprites.other['official-artwork'].front_default` | `string \| null`                            | Официальный арт (рекомендуется для карточек)                                           |
| `sprites.other['official-artwork'].front_shiny`   | `string \| null`                            | Официальный арт шайни-версии                                                           |
| `sprites.other.showdown`                          | `object`                                    | Анимированные спрайты из Pokemon Showdown (front/back + shiny/female варианты)         |
| `sprites.versions`                                | `Record<string, Record<string, SpriteSet>>` | Спрайты по поколениям и версиям игр                                                    |

### forms (формы)

| Поле           | Тип      | Описание                        |
| -------------- | -------- | ------------------------------- |
| `forms[].name` | `string` | Название формы                  |
| `forms[].url`  | `string` | URL с детальным описанием формы |

### game_indices (индексы в играх)

| Поле                          | Тип      | Описание                                 |
| ----------------------------- | -------- | ---------------------------------------- |
| `game_indices[].game_index`   | `number` | Внутренний ID покемона в конкретной игре |
| `game_indices[].version.name` | `string` | Название версии игры                     |

### held_items (предметы)

| Поле                                          | Тип      | Описание                              |
| --------------------------------------------- | -------- | ------------------------------------- |
| `held_items[].item.name`                      | `string` | Название предмета                     |
| `held_items[].version_details[].version.name` | `string` | Версия игры                           |
| `held_items[].version_details[].rarity`       | `number` | Шанс выпадения предмета (в процентах) |

### past_types (прошлые типы)

| Поле                           | Тип      | Описание                                               |
| ------------------------------ | -------- | ------------------------------------------------------ |
| `past_types[].generation.name` | `string` | Поколение, в котором действовал этот набор типов       |
| `past_types[].types[]`         | `array`  | Массив типов, которые были у покемона в этом поколении |

### past_abilities (прошлые способности)

| Поле                                     | Тип              | Описание                                                |
| ---------------------------------------- | ---------------- | ------------------------------------------------------- |
| `past_abilities[].generation.name`       | `string`         | Поколение, в котором действовал этот набор способностей |
| `past_abilities[].abilities[]`           | `array`          | Массив способностей покемона в этом поколении           |
| `past_abilities[].abilities[].ability`   | `object \| null` | Ссылка на способность (null если слот был пуст)         |
| `past_abilities[].abilities[].is_hidden` | `boolean`        | Является ли способность скрытой                         |
| `past_abilities[].abilities[].slot`      | `number`         | Порядковый номер слота                                  |

### past_stats (прошлые характеристики)

| Поле                             | Тип      | Описание                                            |
| -------------------------------- | -------- | --------------------------------------------------- |
| `past_stats[].generation.name`   | `string` | Поколение, в котором действовали эти характеристики |
| `past_stats[].stats[]`           | `array`  | Массив характеристик покемона в этом поколении      |
| `past_stats[].stats[].base_stat` | `number` | Базовое значение характеристики                     |
| `past_stats[].stats[].effort`    | `number` | Очки усилий (EV)                                    |
| `past_stats[].stats[].stat.name` | `string` | Название характеристики                             |

### cries (звуки)

| Поле           | Тип      | Описание                                      |
| -------------- | -------- | --------------------------------------------- |
| `cries.latest` | `string` | URL аудиофайла с актуальным криком покемона   |
| `cries.legacy` | `string` | URL аудиофайла с классическим криком покемона |

### species (вид)

| Поле           | Тип      | Описание                                              |
| -------------- | -------- | ----------------------------------------------------- |
| `species.name` | `string` | Название вида                                         |
| `species.url`  | `string` | URL для получения данных о виде (поколение, описание) |

---

## Эндпоинт: GET /api/v2/pokemon-species/{id} (вид)

### Основные поля

| Поле                     | Тип       | Описание                                                 |
| ------------------------ | --------- | -------------------------------------------------------- |
| `id`                     | `number`  | Уникальный идентификатор вида                            |
| `name`                   | `string`  | Имя вида                                                 |
| `order`                  | `number`  | Порядковый номер для сортировки                          |
| `gender_rate`            | `number`  | Вероятность быть самкой (в восьмых долях, -1 = бесполый) |
| `capture_rate`           | `number`  | Базовый шанс поимки (0–255)                              |
| `base_happiness`         | `number`  | Базовый уровень счастья (0–255)                          |
| `is_baby`                | `boolean` | Является ли покемон детёнышем                            |
| `is_legendary`           | `boolean` | Является ли покемон легендарным                          |
| `is_mythical`            | `boolean` | Является ли покемон мифическим                           |
| `hatch_counter`          | `number`  | Количество циклов для вылупления из яйца                 |
| `has_gender_differences` | `boolean` | Есть ли визуальные различия между полами                 |
| `forms_switchable`       | `boolean` | Может ли покемон менять форму в бою                      |

### generation (поколение)

| Поле              | Тип      | Описание                                                |
| ----------------- | -------- | ------------------------------------------------------- |
| `generation.name` | `string` | Название поколения (generation-i, generation-ii и т.д.) |
| `generation.url`  | `string` | URL с детальным описанием поколения                     |

### growth_rate (скорость роста)

| Поле               | Тип      | Описание                                     |
| ------------------ | -------- | -------------------------------------------- |
| `growth_rate.name` | `string` | Тип кривой опыта (slow, medium, fast и т.д.) |

### pokedex_numbers (номера в покедексах)

| Поле                             | Тип      | Описание                                           |
| -------------------------------- | -------- | -------------------------------------------------- |
| `pokedex_numbers[].entry_number` | `number` | Номер покемона в конкретном покедексе              |
| `pokedex_numbers[].pokedex.name` | `string` | Название покедекса (national, kanto, johto и т.д.) |

### egg_groups (группы яиц)

| Поле                | Тип      | Описание                                            |
| ------------------- | -------- | --------------------------------------------------- |
| `egg_groups[].name` | `string` | Название группы яиц (monster, water1, fairy и т.д.) |

### color, shape, habitat

| Поле           | Тип              | Описание                                                            |
| -------------- | ---------------- | ------------------------------------------------------------------- |
| `color.name`   | `string`         | Основной цвет покемона (red, blue, green и т.д.)                    |
| `shape.name`   | `string`         | Форма тела (upright, quadruped, wings и т.д.)                       |
| `habitat.name` | `string \| null` | Среда обитания (cave, forest, sea и т.д., null для новых поколений) |

### evolves_from_species (эволюция)

| Поле                        | Тип              | Описание                                           |
| --------------------------- | ---------------- | -------------------------------------------------- |
| `evolves_from_species`      | `object \| null` | Вид, из которого эволюционирует (null для базовых) |
| `evolves_from_species.name` | `string`         | Имя предыдущей эволюции                            |

### evolution_chain (цепочка эволюции)

| Поле                  | Тип      | Описание                                  |
| --------------------- | -------- | ----------------------------------------- |
| `evolution_chain.url` | `string` | URL для получения полной цепочки эволюции |

### flavor_text_entries (описания из покедекса)

| Поле                                  | Тип      | Описание                               |
| ------------------------------------- | -------- | -------------------------------------- |
| `flavor_text_entries[].flavor_text`   | `string` | Текст описания из покедекса            |
| `flavor_text_entries[].language.name` | `string` | Язык описания (en, ja, fr и т.д.)      |
| `flavor_text_entries[].version.name`  | `string` | Версия игры, из которой взято описание |

### genera (род/категория)

| Поле                     | Тип      | Описание                                     |
| ------------------------ | -------- | -------------------------------------------- |
| `genera[].genus`         | `string` | Категория покемона (например "Seed Pokémon") |
| `genera[].language.name` | `string` | Язык                                         |

### names (локализованные имена)

| Поле                    | Тип      | Описание                    |
| ----------------------- | -------- | --------------------------- |
| `names[].name`          | `string` | Локализованное имя покемона |
| `names[].language.name` | `string` | Язык                        |

### varieties (вариации)

| Поле                       | Тип       | Описание                                          |
| -------------------------- | --------- | ------------------------------------------------- |
| `varieties[].is_default`   | `boolean` | Является ли вариация формой по умолчанию          |
| `varieties[].pokemon.name` | `string`  | Имя вариации (например bulbasaur, bulbasaur-mega) |
| `varieties[].pokemon.url`  | `string`  | URL покемона-вариации                             |

### pal_park_encounters (Pal Park)

| Поле                               | Тип      | Описание                                             |
| ---------------------------------- | -------- | ---------------------------------------------------- |
| `pal_park_encounters[].area.name`  | `string` | Зона в Pal Park (field, mountain, sea, pond, forest) |
| `pal_park_encounters[].area.url`   | `string` | URL зоны                                             |
| `pal_park_encounters[].base_score` | `number` | Базовые очки за поимку в Pal Park                    |
| `pal_park_encounters[].rate`       | `number` | Частота появления в зоне                             |

---

## Клиентские модели (используются в компонентах)

### PokemonCardModel

| Поле         | Тип        | Источник                                                  | Описание        |
| ------------ | ---------- | --------------------------------------------------------- | --------------- |
| `id`         | `number`   | `pokemon.id`                                              | ID покемона     |
| `name`       | `string`   | `pokemon.name`                                            | Имя покемона    |
| `imageUrl`   | `string`   | `pokemon.sprites.other['official-artwork'].front_default` | URL изображения |
| `typeList`   | `string[]` | `pokemon.types[].type.name`                               | Список типов    |
| `generation` | `string`   | `pokemon-species.generation.name`                         | Поколение       |

### PokemonDetailModel

| Поле            | Тип                     | Источник                                                  | Описание                  |
| --------------- | ----------------------- | --------------------------------------------------------- | ------------------------- |
| `id`            | `number`                | `pokemon.id`                                              | ID покемона               |
| `name`          | `string`                | `pokemon.name`                                            | Имя покемона              |
| `height`        | `number`                | `pokemon.height`                                          | Рост (дециметры)          |
| `weight`        | `number`                | `pokemon.weight`                                          | Вес (гектограммы)         |
| `imageUrl`      | `string`                | `pokemon.sprites.other['official-artwork'].front_default` | URL основного изображения |
| `shinyImageUrl` | `string`                | `pokemon.sprites.other['official-artwork'].front_shiny`   | URL шайни-изображения     |
| `typeList`      | `string[]`              | `pokemon.types[].type.name`                               | Список типов              |
| `abilityList`   | `PokemonAbilityModel[]` | `pokemon.abilities[]`                                     | Список способностей       |
| `statList`      | `PokemonStatModel[]`    | `pokemon.stats[]`                                         | Список характеристик      |
| `generation`    | `string`                | `pokemon-species.generation.name`                         | Поколение                 |
| `description`   | `string`                | `pokemon-species.flavor_text_entries[]` (language=en)     | Описание из покедекса     |
