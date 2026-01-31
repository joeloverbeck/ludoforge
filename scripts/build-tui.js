import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/tui/ludoforge-play.js"],
  outfile: "dist/tui/ludoforge-play.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  jsx: "automatic",
  jsxImportSource: "react",
  loader: { ".jsx": "jsx", ".js": "js" },
  packages: "external",
  banner: { js: "#!/usr/bin/env node" },
});
