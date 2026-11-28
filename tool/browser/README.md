# Test the atlas

From the repository root, install the pinned tools and build the Pages layout.

```sh
dart pub get --enforce-lockfile
dart pub global activate jaspr_cli 0.24.0-beta.2
dart analyze --fatal-infos
dart run tool/validate.dart
dart run tool/check_import.dart
dart pub global run jaspr_cli:jaspr build --dart-define-server=SITE_BASE_PATH=/flutter.spot --dart-define-server=SITE_URL=https://shiva396.github.io/flutter.spot/
dart run tool/sitemap.dart https://shiva396.github.io/flutter.spot/
python3 tool/browser/static.py
npm ci --prefix tool/browser
tool/browser/node_modules/.bin/playwright-core install --with-deps chromium firefox webkit
preview_root=$(mktemp -d)
ln -s "$PWD/build/jaspr" "$preview_root/flutter.spot"
python3 -m http.server 4173 --bind 127.0.0.1 --directory "$preview_root"
```

In a second terminal, run the browser and notification suites.

```sh
export PREVIEW_URL=http://127.0.0.1:4173/flutter.spot/
npm test --prefix tool/browser
node tool/browser/community.cjs
node --test tool/push/store.test.mjs
python3 -m unittest discover -s tool/push -p 'test_*.py'
npm run benchmark --prefix tool/browser
```

The browser suite checks the atlas in Chromium, Firefox and WebKit at widths from 320 to 1440 pixels. It checks location selection, filters, history, static navigation, form validation and downloaded TOML. Chromium also exercises native touch input through CDP, software globe rendering, failed texture/model requests, reduced motion and notification subscription recovery. The subscription service and push provider are local fixtures.

The benchmark runs three cold visits at each of two sizes. The desktop profile uses a 1440 × 900 viewport. The 390 × 844 mobile profile uses DPR 2, fourfold CPU slowdown, 80 ms latency and a 4 Mbit/s download limit. The sampler records browser LCP, session-window CLS, the longest interaction in each short visit, animation-frame intervals during a zoom, pre-interaction transfer size, the WebGL renderer and final JavaScript heap usage. Set `CHROME_BIN` to use a system Chromium executable.

Set `NATIVE_GPU=1` on a Linux machine with working OpenGL to profile the hardware renderer. An optional `GPU_BUSY_PATH` can point to the active GPU’s readable sysfs busy-percent counter. It samples whole-device activity during the zoom.
