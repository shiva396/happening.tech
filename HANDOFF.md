# Resume the flutter.spot atlas

Open this directory on the existing `feature/flutter-community-atlas` branch. The working project was moved from `happening.tech` to `flutter.spot`. The Dart package is `flutter_spot`. The next task is to finish the Jaspr atlas, test the complete site, and open a redesign PR. This is an in-progress checkpoint prepared on 28 November 2026.

## User brief and references

- The complete original 20-section specification, including the final design and credit instructions, is in [the product brief](docs/atlas/BRIEF.md). The repository and platform name subsequently changed to **flutter.spot**.
- The supplied attachment shows Namma Dash. A byte-identical copy lives in [the design references](docs/atlas/namma-dash-reference.png). A separate Earth reference image was mentioned in the brief. The available Earth direction comes from the written brief and Apple Photos Places.
- Use a light blue and white Namma Flutter palette. The source brand uses deep blue `#01589B`, cyan `#13B9FD`, ink `#0E1A24`, muted `#5A6B7A` and ice `#E8F2FB`. Local DM Sans and italic Instrument Serif fonts and their licenses are in `web/fonts/`. [Namma Flutter](https://nammaflutter.com/)
- Program View takes its editorial hierarchy and distinction between upcoming and past events from the supplied reference. [Shipaton events](https://shipaton.com/events)
- Preserve the compact footer credit “Made with love by Shiva and Justin from NammaFlutter”, the dedicated worldwide community directory, and community-contributed TOML. Every displayed count and activity indicator must come from real data.

## Repository and publication

The rename is in [PR #3](https://github.com/shiva396/flutter.spot/pull/3), open at the time of this handoff. The feature branch includes its head, `56b9c87`. Fetch the current refs before opening the redesign PR. If the rename PR is still open, the redesign can target its branch and be retargeted to main after it merges. If it was squash-merged, rebase the feature work onto the renamed main without duplicating the rename commit. The redesign checkpoint is local. The live deployment remains a separate GitHub Pages workflow.

## Implemented on the feature branch

| Area | Files and current behavior |
| --- | --- |
| Catalog | `events/`, `communities/`, `legacy-events/`, `lib/event.dart`, `lib/community.dart`, `lib/catalog_toml.dart`. There are 12 verified Flutter events, 11 communities, and 10 previous event records for permanent detail routes. Five events were upcoming on the handoff date. Online events can omit coordinates. |
| Contributions | `CONTRIBUTING.md`, `tool/validate.dart`, `tool/import_event.dart`, `tool/check_import.dart`. Local, permitted JSON-LD exports can be converted to reviewable TOML. Validation covers coordinates, time zones, references, date order, cancellations, duplicates, and registration cutoffs. Live API polling would require an approved source and credentials. |
| Photography | `web/art/events/` contains credited city and landmark photos with smaller globe thumbnails. Keep the per-photo source credits and [license ledger](web/art/events/CREDITS.txt). The images depict locations. |
| Earth | `web/world/`, `tool/world/bake.py`, `web/art/world-poster.webp`, `web/art/world-surface.webp`. A static first frame leads into textured WebGL with a Canvas fallback, a 25°N / 42°E home camera, geographic projection, inertia, clustering, occlusion and country selection. Retain `art/countries.json`, the Natural Earth relief source and vendored geo library/license. |
| Dash | `web/art/dash.glb`, `web/art/dash.webp`, `web/dash/`, `tool/dash/`. The 144,200-byte authored 3D model and its 11,512-byte poster share geometry. The renderer is separate from timers, cooldowns, poses and contextual reactions. The world currently contains the character host. |
| Jaspr pages | `lib/app.dart`, `lib/pages/home.dart`, `lib/atlas/`. The intended order is world, program, directory, activity, then credit. Event and community permalink views, calendar export, metadata, Open Graph and event JSON-LD are drafted. Directory and event content render as semantic HTML. |
| Discovery | `web/discovery/state.js` and `app.js` implement the shared URL model, selected event/community, location lookup, composable filters, rendering integration, contextual preview and Dash event channel. `lib/atlas/presentation.dart` serializes the data. |
| Publishing | The Pages workflow has a scheduled rebuild, canonical site URL input and sitemap generation via `tool/sitemap.dart`. The push extractor handles the normalized catalog. |

## First work to finish

1. **Connect submission to the normalized schema.** The last `dart analyze --fatal-infos` reported one compile error and ten lint findings. `lib/app.dart` passes a community list to `SubmitPage`, whose old constructor takes no list. Update the form and `web/submit.js` together. Select a real community ID, use the domain categories and attendance formats, generate `updated_at`, and omit physical fields for an online event. Preserve the existing time-zone, DST, download and GitHub proposal behavior. Validate an actual generated file with the new parser.
2. **Implement the page-level visual design.** `lib/main.server.dart` currently links two pending stylesheets, `web/constants/atlas.css` and `web/atlas.css`. The globe module's own stylesheet exists. Centralize palette, type, sizing, spacing, elevation, focus and motion. Compose a large right-hand Earth, a small floating wordmark, editorial “Flutter, everywhere.” title, location search, compact lower-corner statistics/controls and a mobile layout with a bottom sheet. Style the program, directory, profiles, empty states, contribution form and notifications. Keep the page usable with JavaScript disabled.
3. **Finish integration.** Pass `e.artworkThumbnail` as `thumbnail` for globe places, resolve community thumbnails from genuine associated events, and check selection, history, zoom transitions and filter consistency. Fix the “Suggest a community” fragment to the contributor guide’s actual `#add-a-community` heading. Set aside a square for the Dash button and verify its transparent poster. A proposed enhancement moves the single character to a small program or empty-state perch. Implement and test it if needed to fulfill contextual behavior. Check that controls follow reduced-motion preferences and that offscreen characters and renderers suspend.
4. **Retire obsolete UI.** The old navigation animals, generic programme, theme, globe and motion assets/tests still exist. Map consumers first. Preserve useful notification and contribution flows, local calendar identity, existing external event URLs and valid attribution. Replace old UI tests and benchmark targets with atlas-specific coverage. Refresh README and the old `PLAN.md` to match the new experience.
5. **Verify and submit.** Build under the GitHub Pages project subpath. Check generated pages, local image URLs, sitemap, canonical URLs, JSON-LD, chronological ordering, and expired registration handling. Test pointer, keyboard, screen-reader names, no JS, failed textures, reduced motion, mobile scrolling, and browser back/forward. Inspect desktop and mobile screenshots. Record device and test conditions for LCP, INP, CLS, network and frame timing. Aim for LCP ≤2.5 s, INP ≤200 ms, CLS <0.1. Finish on the feature branch, push and open the redesign PR. Include screenshots, measured results and any physical-device verification limits.

## Verification at handoff

The catalog validator, JSON-LD fixtures and three Python notification tests passed. Individual globe checks passed in desktop Chromium, Chromium touch emulation and forced Canvas fallback. At 390 × 844 and DPR 2, a 90-frame camera transition sample in headless SwiftShader Chrome measured 16.7 ms median and p95 frame intervals. This measures the isolated globe in emulation. Full-page vitals, cross-browser atlas testing and physical-device profiling are outstanding.

The Dash GLB passed the Khronos validator with zero reported issues. Component checks in Chromium covered event reactions, landing, repeated taps, reduced motion, offscreen cleanup and a failed model fetch. The complete redesign still needs its first successful production build and visual review. The existing `build/jaspr` directory may hold output from the earlier rename-only build.

## Local commands

Use Dart 3.14 and the pinned Jaspr CLI. The repo already contains the dependencies and asset sources for the work in progress.

```sh
dart pub get --enforce-lockfile
dart run tool/validate.dart
dart run tool/check_import.dart
python3 -m unittest discover -s tool/push -p 'test_*.py'
dart analyze --fatal-infos
dart pub global run jaspr_cli:jaspr build \
  --dart-define-server=SITE_BASE_PATH=/flutter.spot \
  --dart-define-server=PROJECT_REPOSITORY=shiva396/flutter.spot \
  --dart-define-server=SITE_URL=https://shiva396.github.io/flutter.spot/
dart run tool/sitemap.dart https://shiva396.github.io/flutter.spot/
```

For a fresh chat, use this prompt:

> Read HANDOFF.md and docs/atlas/BRIEF.md. Continue from the existing feature/flutter-community-atlas checkpoint in this checkout. Finish and test the flutter.spot atlas, then open the redesign PR.
