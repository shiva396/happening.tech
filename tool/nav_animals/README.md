# Navigation animals

Jaspr discovers the clips in `web/motion/animals/` during its normal build. Each clip contains two named Lottie segments. Programme uses `hop` and World view uses `orbit`. Their matching `-front` markers tell the player when the animal crosses in front of the label.

To change the cast, edit the clay models in `studio.js` and the motion parameters in `cast.json`. The baker renders the articulated poses, then samples the trajectories from `physics.py`. With Node.js, Python 3 and Chrome installed, run these commands from this directory:

```sh
npm ci
npm run bake
```

Set `CHROME_BIN` if Chrome is installed somewhere other than `/usr/bin/google-chrome`. With the local preview running, use `npm run check` to verify the shuffle and both depth passes in Chrome. Set `PREVIEW_URL` to check a different preview address. Commit the resulting clips with the source changes. The browser uses the local dotLottie player. Three.js runs only during asset creation.
