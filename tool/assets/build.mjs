import { access, rm } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = join(root, "build/jaspr");
await access(join(output, "index.html"));

const entries = [
  "site.css", "submit.css", "discovery/app.js", "discovery/scrollbar.js",
  "world/world.js", "world/locations.js", "world/software.js",
  "submit.js", "notifications.js", "push/worker.js",
];
const result = await build({
  absWorkingDir: root,
  entryPoints: entries.map(path => "web/" + path),
  outbase: "web",
  outdir: output,
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  loader: { ".woff2": "file" },
  assetNames: "fonts/[name]",
  metafile: true,
  plugins: [{
    name: "lazy-atlas-features",
    setup(plugin) {
      // Keep each lazy entry at its public URL. Its asset paths use import.meta.url.
      plugin.onResolve({ filter: /.*/ }, args => {
        if (args.kind === "dynamic-import") return { path: args.path, external: true };
      });
    },
  }],
});

// Jaspr copies unbundled modules and Dart dependency data into its static output.
const published = new Set(Object.keys(result.metafile.outputs).map(path => resolve(root, path)));
for (const path of Object.keys(result.metafile.inputs)) {
  if (!path.startsWith("web/") || ![".js", ".css"].includes(extname(path))) continue;
  const copy = join(output, path.slice("web/".length));
  if (!published.has(copy)) await rm(copy, { force: true });
}
await rm(join(output, "packages"), { recursive: true, force: true });
