# Browser checks

These checks exercise the static HTML, CSS, assets and browser code that Jaspr publishes to Pages. Start a production preview from the repository root.

```sh
dart pub global run jaspr_cli:jaspr build --dart-define-server=HAPPENING_REPOSITORY=shiva396/happening.tech
python3 -m http.server 4173 --directory build/jaspr
```

In this directory, use Node 20 or later.

```sh
npm ci
npx playwright-core install --with-deps chromium firefox webkit
npm test
NODE_PATH="$PWD/node_modules" BROWSER_ENGINE=webkit node ../nav_animals/check.cjs
```

The site suite covers directory filters, calendar links, the archive, the activity tooltip, country selection, globe zoom, both map styles, theme persistence, listing validation and TOML generation. It checks six page states at ten widths between 320 and 2560 CSS pixels. The navigation suite also waits for the actual minute cue and checks the rendered pixels of each animal. The pull request workflow runs both suites on all three engines under the Pages project path.

Set `PREVIEW_URL` for a different preview and `BROWSER_ENGINE` to run a single engine. For a locally installed Chrome or Edge, set `BROWSER_ENGINE=chromium` and `CHROME_BIN` to its executable.

## Compare animation cost

```sh
BASELINE_URL=http://localhost:4175/ PREVIEW_URL=http://localhost:4173/ npm run benchmark
```

Serve the two builds on the same machine and keep other browser workloads idle. The runner alternates build order over five fresh browser contexts per build and engine at 1280 × 800. It counts animal archive requests through 750 ms after component registration, times pointer entry to the first advancing koala frame, and samples animation-frame intervals for the next 1.5 seconds. It reports median startup latency and the pooled 95th percentile frame interval. Frame intervals measure browser scheduling, while the navigation suite checks visible pixels. Omit `BASELINE_URL` to measure one build.
