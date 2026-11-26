# Navigation performances

Hover or keyboard-focus Programme for the monkey or World view for the koala. Clicking or tapping a link plays its ten-second performance on arrival. While the header is visible, a shared clock invites both characters to play every minute. Interaction can trigger a new performance as soon as the previous one finishes. Leaving a link lets its performance finish. Offscreen and reduced-motion states release the players.

The Jaspr component supplies two decorative planes around the original link text. Each local dotLottie archive contains a body animation and a depth-tested pass of its paws and legs. The body is the playback clock for both. The contact points exported from the 3D rig place the feet on the header border, the hands on the measured lettering and the hips on the perch. The browser measures these anchors again when the header changes size.

The Three.js studio and the trajectory baker run offline. To rebuild the committed assets with Node.js, Python 3 and Chrome installed, run the following from this directory.

```sh
npm ci
npm run bake
```

Use `CHROME_BIN` to select a different Chrome executable. Run `npm run check` against the local preview to test the interactions and shared minute timer. Set `PREVIEW_URL` to check another preview address.

The check uses bundled Chromium by default. Install it with `npx playwright-core install chromium`, or pass `CHROME_BIN` for installed Chrome or Edge. Set `BROWSER_ENGINE=firefox` or `BROWSER_ENGINE=webkit` after installing the matching browser. The [browser checks](../browser/README.md) cover the rest of the site.
