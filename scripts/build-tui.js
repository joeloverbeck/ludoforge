import { glob } from "node:fs/promises";
import esbuild from "esbuild";

const entryPoints = [];
for await (const file of glob("src/tui/**/*.{js,jsx}")) {
  entryPoints.push(file);
}

await esbuild.build({
  entryPoints,
  outdir: "dist/tui",
  outbase: "src/tui",
  bundle: false,
  format: "esm",
  platform: "node",
  target: "node20",
  jsx: "automatic",
  jsxImportSource: "react",
  loader: { ".jsx": "jsx", ".js": "js" },
  packages: "external",
});
