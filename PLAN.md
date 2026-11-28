# Flutter community atlas

The opening screen is Earth. A land tap or place search opens a country or city inside the sphere, with local gatherings, community profiles and credited photography. The same circular reading area hosts the program, directory, activity, event details, contribution form and notification settings. The dock returns visitors to the surface with their selection intact.

| Area | Implementation |
| --- | --- |
| Catalog | `events/` and `communities/` hold reviewed TOML. The Dart domain validates coordinates, host time zones, duplicates, organizer references and registration deadlines. `legacy-events/` preserves earlier detail routes. |
| Publication | GitHub Pages rebuilds after changes to main and on a daily schedule. `tool/import_event.dart` converts a permitted organizer JSON-LD export to reviewable TOML. |
| Pages | `lib/atlas/` contains the world, program, directory, profiles and activity stream. `web/discovery/` handles geographic place pages, in-globe reading, filters, deep links and browser history. |
| World | `web/world/` projects and clusters the catalog, manages camera gestures and selects countries. The static poster, textured WebGL surface and Canvas fallback share one projection. `tool/world/bake.py` bakes a matching overview, poster and two levels of NASA satellite tiles up to 21,504 × 10,752 pixels. Both renderers request regional tiles as the camera zooms. |
| Namma Dash | The mascot is paused. Its model, poster and source are kept with the authoring tools outside the published site. |
| Design | Self-hosted Source Sans 3, blue-and-white design tokens and component styles live under `web/`. The original mascot reference and product brief live in `docs/atlas/`. |
| Verification | The catalog fixtures, static-link audit, browser checks and performance sampler exercise the production Pages build. The browser guide explains how to repeat them. |

Live source polling requires an approved integration and source credentials. Organizers can submit a permitted export through the existing import and review flow. [Contribution guide](CONTRIBUTING.md)
