🐾 PR Review завершён — PR #147 "Sprint 3: Directives, Pipes & Forms"

Объём: 600 файлов, 137 коммитов, develop → main.
Ревью проведено скиллом pr-review (автономный режим, backend = GitHub MCP).
Бэкенд gh недоступен (api.github.com под фаерволом), поэтому через GitHub MCP.

Как ревьюил: распараллелил на 6 агентов по зонам —
 1) frenzy ui/components (часть 1)
 2) frenzy ui/components (часть 2) + directives + pipes
 3) frenzy data + debug/perf
 4) partykit-server + shared-game
 5) auth + main-catalog + pokemon-profile (формы — тема спринта)
 6) core + shared + profile + about

Итог: опубликовано ревью (event = COMMENT) с 14 инлайн-замечаниями + сводка.

Топ находок:
 - 💩 validate-join.ts:33 — дыра в анти-чите: монотонность через "<=" пускает все hp-гейты в 0, читер спавнится сразу на стейдже 3. Фикс — строгий порядок гейтов.
 - 💩 login.facade.ts:35 — токен дублируется в localStorage мимо AuthService (есть TODO-признание). Та же беда в signup.facade.ts.
 - 👺 нейминг: handlePokeNpc -> onPokeNpc, ProfileService -> UserApiService, модели без суффиксов Model/ApiResponse, selectedGenerationList не список.
 - 💩 магические числа: лимит "2" в catalog-filter, priority/durationMs в intro-quips, "Unknown error" в handle-store-error.
 - 🟡 profile.store: switchMap на мутациях отменяет незавершённые запросы (нужен concatMap).

Что НЕ флагал: смешение Reactive/Signal Forms в auth (учебное решение, issue #163), @Service/private-fields-first/withFetch (особенности проекта), фикстуры и debug-панели за гейтом.

Оговорки: taiga-ui MCP отдавал 403, angular-cli MCP недоступен (Node 22.22.2 < 22.22.3) — Taiga/v22 API сверял по консистентности и типам, не по live-докам.

Сильные стороны PR: директивы спринта эталонные, generic-движок с compile-time gating, RoomSession без утечек токенов, функциональный интерсептор, все 112 коммитов conventional.

Ссылка: https://github.com/ngKittyDebug/angular-ngKittyDebugLeft/pull/147
