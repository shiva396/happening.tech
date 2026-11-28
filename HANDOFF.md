# flutter.spot atlas handoff

The redesign is on `feature/flutter-community-atlas`. It includes the world, program, community directory, activity stream, event contribution flow and Namma Dash. The atlas uses the `flutter_spot` Dart package. The public event URLs from the earlier catalog still resolve. All calendar downloads use `@flutter.spot` UIDs, so re-importing an event saved with an earlier UID can create a duplicate in a calendar app.

The production build generated 40 static pages from 12 Flutter events, 11 communities and 10 archived event records on 28 November 2026. The sitemap contains 28 primary atlas pages. The additional routes preserve previously shared links. [Product brief](docs/atlas/BRIEF.md) · [Original Namma Dash reference](docs/atlas/namma-dash-reference.png) · [Implementation guide](PLAN.md)

## Review the design

| World | Program | Directory |
| --- | --- | --- |
| [Desktop world](docs/atlas/screenshots/world.webp) | [Event program](docs/atlas/screenshots/program.webp) | [Community directory](docs/atlas/screenshots/directory.webp) |
| [Mobile world](docs/atlas/screenshots/mobile-world.webp) | [Mobile event sheet](docs/atlas/screenshots/mobile-event.webp) | |

## Verification

- The locked dependencies, Dart analysis, catalog validator and import fixtures passed. The form produced both an online TOML listing and a hybrid listing with coordinates. Both passed the production parser.
- Chromium 158, Firefox 153 and WebKit 26.5 exercised discovery, browser history, community profiles, keyboard controls, static navigation, DST validation and form downloads. Layout checks covered 320–1440 px. Chromium also exercised drag, pinch, vertical page scrolling, Canvas fallback, failed textures, missing Dash geometry, animation preferences and the notification flow with a fixture provider.
- The static audit checked internal links, SVG symbol references, metadata, canonical URLs, structured event data, the sitemap and all 22 calendar identities. axe-core 4.14.1 reported zero automated WCAG A/AA violations on the world, selected-place, archive, directory, event, community, contribution and notification views.
- Three Python notification tests and four Node storage tests passed. The Khronos validator reported zero issues for the Dash GLB. Photography credits are included with the assets. [Credits](web/art/events/CREDITS.txt)

## Performance

Medians of three cold visits to the production build on a loopback HTTP server. Chrome 158 used hardware OpenGL on an AMD Ryzen 5 6600H laptop with Radeon 660M graphics. The short visits included globe zoom/reset, switching views, typing a filter and switching periods. With fewer than 50 interactions, the largest reported interaction duration is the lab INP candidate.

| Cold profile | LCP | Lab INP candidate | CLS | Zoom frame p95 | Initial transfer | JS heap at end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop, 1440 × 900, DPR 1, unthrottled | 100 ms | 56 ms | 0.005 | 16.7 ms | 765 KiB, 31 requests | 12.5 MiB |
| Mobile emulation, 390 × 844, DPR 2 | 832 ms | 56 ms | 0.000 | 16.7 ms | 695 KiB, 26 requests | 3.8 MiB |

The mobile profile used 4× CPU slowdown, 80 ms latency, 4 Mbit/s downstream and 1 Mbit/s upstream. The Earth poster was the LCP element. The whole-device GPU busy counter sampled during zoom had median values of 75% for desktop and 69% for mobile emulation. Transfer totals cover requests through initial network idle. A physical iOS or Android handset and real-user performance data were unavailable. [Repeat the tests](tool/browser/README.md)

## Publication

The redesign PR targets the open repository-rename branch. After the rename merges, the redesign can target main. The Pages workflow publishes main and rebuilds daily. Live source polling would require an approved integration and credentials. The contribution form and local JSON-LD import are ready for use. [Contribution guide](CONTRIBUTING.md)
