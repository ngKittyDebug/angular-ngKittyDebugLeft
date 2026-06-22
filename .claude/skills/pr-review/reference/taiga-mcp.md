# Taiga UI MCP — verification playbook for PR review

The `taiga-ui` MCP server exposes the live Taiga UI v5 docs (import map, component list, usage snippets, migration guide). Use it to **ground every Taiga comment in the real API** instead of training-data memory, which is stale and version-skewed. A wrong-package import is a compile error, and a `suggestion` block that doesn't compile is worse than no comment at all.

## When to call it

- The diff adds/changes a `Tui*` symbol, a `tui*` directive or attribute, a `var(--tui-*)` token, or raw HTML where a Taiga component is the project convention (buttons, inputs, cards, dialogs, avatars, progress, etc.).
- You're about to write "use `TuiX` here" — confirm `TuiX` exists, its package, and its API before suggesting it.
- The PR bumps the Taiga version → read the migration guide.

If a change has nothing to do with Taiga, don't call it — no need to slow the review down.

## Tools

| Tool                                   | Args              | Use                                                                                                                                                    |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mcp__taiga-ui__get_overview`          | —                 | Call **first** when unsure. Returns the Import Map (which package every `Tui*` lives in), the Code Generation Checklist, and the Common Mistakes list. |
| `mcp__taiga-ui__get_list_components`   | `query` (fuzzy)   | Find the right component/directive for a use case, e.g. `query: "avatar"` → `components/Avatar` (KIT).                                                 |
| `mcp__taiga-ui__get_component_example` | `names: string[]` | Real usage snippets for one or more components — copy the shape into your `suggestion` block.                                                          |
| `mcp__taiga-ui__get_migration_guide`   | —                 | Step-by-step version migration; only for Taiga upgrade PRs.                                                                                            |

## Typical review flows

**Flagging raw HTML that should be Taiga:**

1. `get_list_components` with a query describing the element → confirm the component exists.
2. `get_component_example` for that component → ground the `suggestion` block in the documented usage.
3. Write the comment with a snippet that actually compiles + the correct import package.

**Validating a student's Taiga usage:**

1. If the import package looks off → `get_overview`, check the Import Map. Wrong package = 🔴 (compile error), not a nit.
2. If the API shape looks off (inputs, directive on wrong tag, event type) → `get_component_example` to compare against the real API.
3. Only roast once you've confirmed it against the docs.

**Cross-check against project rules:** the MCP tells you what Taiga _supports_; `CLAUDE.md` ("UI library — Taiga UI v5") tells you what _this project_ mandates (directives on native tags, `var(--tui-*)` colors over hex, `TuiAvatar` via child `<img>` not `[tuiAvatar]="url"`). A comment should satisfy both — MCP for correctness, CLAUDE.md for house style.

## Fallback

If the MCP server doesn't respond, fall back to `CLAUDE.md` conventions and **say so in the comment** ("не смог сверить с доками Taiga") rather than asserting an API you can't confirm.
