// Both the component and its matching WASM renderer are served by Jaspr.
let ready;
export function loadComponent() {
  ready ??= import("./vendor/dotlottie-wc-0.12.2/dotlottie-wc.js")
    .then((module) => module.setWasmUrl(new URL("./vendor/dotlottie-wc-0.12.2/dotlottie-player.wasm", import.meta.url).href))
    .catch((error) => {
      ready = undefined;
      throw error;
    });
  return ready;
}
