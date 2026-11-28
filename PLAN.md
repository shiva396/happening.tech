# Flutter community atlas

The atlas opens on Earth. Photo postcards show places with Flutter gatherings and communities. Each has a corresponding event or community URL. The program, directory and activity stream provide another way into the same catalog.

| Area | Implementation |
| --- | --- |
| Catalog | `events/` and `communities/` hold reviewed TOML. The Dart domain validates coordinates, host time zones, duplicates, organizer references and registration deadlines. `legacy-events/` preserves earlier detail routes. |
| Publication | GitHub Pages rebuilds after changes to main and on a daily schedule. `tool/import_event.dart` converts a permitted organizer JSON-LD export to reviewable TOML. |
| Pages | `lib/atlas/` contains the world, program, directory, profiles and activity stream. `web/discovery/` handles filters, selection, deep links and browser history. |
| World | `web/world/` projects and clusters the catalog, manages camera gestures and selects countries. The static poster, textured WebGL surface and Canvas fallback share one projection. `tool/world/bake.py` prepares the texture and poster. |
| Namma Dash | `tool/dash/` authors the model and its poster. `web/dash/` separates the renderer from weighted idle behavior, reactions and cooldowns. A single character can move between the globe, program, an empty result, the directory and the footer. |
| Design | Local DM Sans and Instrument Serif, blue-and-white design tokens and component styles live under `web/`. The original mascot reference and product brief live in `docs/atlas/`. |
| Verification | The catalog fixtures, static-link audit, browser checks and performance sampler exercise the production Pages build. The browser guide explains how to repeat them. |

Live source polling requires an approved integration and source credentials. Organizers can submit a permitted export through the existing import and review flow. [Contribution guide](CONTRIBUTING.md)
