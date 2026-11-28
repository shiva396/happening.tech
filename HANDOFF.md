# flutter.spot atlas handoff

The redesign is on `feature/flutter-community-atlas`. The Earth fills the opening viewport. Tap land or use Find a place to open local events and communities inside the sphere. The dock opens the program, directory and activity there. Event details, profiles, the listing form and notification settings use the same interior. Browser history restores place and selection. Shared permanent links render within the same globe frame directly from HTML. The atlas uses the `flutter_spot` Dart package. The public event URLs from the earlier catalog still resolve. All calendar downloads use `@flutter.spot` UIDs, so re-importing an event saved with an earlier UID can create a duplicate in a calendar app.

The production build generated 179 static pages from 12 Flutter events, 150 communities and 10 archived event records on 28 November 2026. The sitemap contains 167 primary atlas pages. The additional routes preserve previously shared links. [Product brief](docs/atlas/BRIEF.md) · [Implementation guide](PLAN.md)

The directory includes all 144 groups in the public Flutter Meetup Network across 64 countries and six additional organizers. Five existing profiles also belong to the network and retain their permanent IDs and event links. The site serves all artwork locally. Flutter Kumasi uses the network icon because the group lists no photo. [Meetup directory](https://www.meetup.com/pro/flutter/) · [Image sources](docs/atlas/community-art.md)

## Review the design

| Surface | Inside a city | Other views |
| --- | --- | --- |
| [Desktop globe](docs/atlas/screenshots/world.webp) · [Utah event](docs/atlas/screenshots/selected-event.webp) | [Chennai](docs/atlas/screenshots/place.webp) | [Program](docs/atlas/screenshots/program.webp) · [Directory](docs/atlas/screenshots/directory.webp) |
| [Mobile globe](docs/atlas/screenshots/mobile-world.webp) | [Mobile Chennai](docs/atlas/screenshots/mobile-place.webp) | [Selected event](docs/atlas/screenshots/mobile-event.webp) |

The 2,048 × 1,024 overview and two regional detail levels use NASA’s August 2004 Blue Marble satellite mosaic. The finest level is 21,504 × 10,752 pixels. The globe loads visible tiles on demand, with three requests in flight and up to 16 resident WebGL tiles. Spreading two fingers by 50% increases the camera zoom by about 2.16× and keeps the place under their midpoint. Curved leaders connect the existing pin and card endpoints. Selecting a listing opens details at the right edge on desktop and above the dock on phones. The comparison shows Warsaw from the same camera position. [Zoom comparison](docs/atlas/screenshots/zoom-comparison.webp)

The atlas follows the system light or dark setting on first visit. The sun or moon button saves a choice across pages and visits. Light opens from the globe’s center to its rim, then from the center to the screen corners. Dark closes the screen iris first, then the globe iris. Reduced motion and the atlas pause setting apply the choice immediately. One curved scrollbar follows the reader’s right rim with an even inset on desktop and stays inside the viewport on phones. Its thumb supports dragging, touch and keyboard navigation. [Watch the theme change](docs/atlas/screenshots/theme-iris.webp)

The atlas uses a self-hosted Source Sans 3 variable font for map labels, reading views and forms.

## Verification

- The locked dependencies, Dart analysis, catalog validator and import fixtures passed. The form produced both an online TOML listing and a hybrid listing with coordinates. Both passed the production parser.
- Chromium 158, Firefox 153 and WebKit 26.5 exercised discovery, city-to-profile navigation, deep links, browser history, keyboard controls, in-globe utility pages, preserved form drafts, static navigation, DST validation and form downloads. Layout checks covered 320–1440 px. Chromium also exercised land selection, drag, pinch, scrolling the reading area, recovery from an unavailable article, Canvas fallback, high-density close-ups, unavailable map tiles, animation preferences and the notification flow with a fixture provider.
- The static audit checked internal links, SVG symbol references, metadata, canonical URLs, structured event data, the sitemap and all 22 calendar identities. axe-core 4.14.1 reported zero automated WCAG A/AA violations across 16 states in each theme, including the globe, a selected postcard, a city, all dock views, in-globe readers and permanent pages.
- Three Python notification tests and four Node storage tests passed. Photography credits are included with the assets. [Credits](web/art/events/CREDITS.txt)

## Performance

Medians of three cold visits to the production build on a loopback HTTP server. Chrome 158 used hardware OpenGL on an AMD Ryzen 5 6600H laptop with Radeon 660M graphics. The short visits included globe zoom/reset, switching views, typing a filter and switching periods. With fewer than 50 interactions, the largest reported interaction duration is the lab INP candidate.

| Cold profile | LCP | Lab INP candidate | CLS | Zoom frame p95 | Initial transfer | JS heap at end |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop, 1440 × 900, DPR 1, unthrottled | 124 ms | 56 ms | 0.0000 | 16.7 ms | 804 KiB, 32 requests | 5.1 MiB |
| Mobile emulation, 390 × 844, DPR 2 | 740 ms | 120 ms | 0.0000 | 16.7 ms | 755 KiB, 28 requests | 3.4 MiB |

The mobile profile used 4× CPU slowdown, 80 ms latency, 4 Mbit/s downstream and 1 Mbit/s upstream. The Earth poster was the LCP element. The whole-device GPU counter varied across the short zoom samples and does not isolate browser work. Transfer totals cover requests through initial network idle. A physical iOS or Android handset and real-user performance data were unavailable. [Repeat the tests](tool/browser/README.md)

## Publication

The repository rename merged in #3. The redesign PR targets main. The Pages workflow publishes main and rebuilds daily. Live source polling would require an approved integration and credentials. The contribution form and local JSON-LD import are ready for use. [Contribution guide](CONTRIBUTING.md)
