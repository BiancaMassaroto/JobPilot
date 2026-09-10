import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (Feature 07) pulls in @napi-rs/canvas, which ships a native
  // .node binding — Turbopack's production build can't place that as an
  // ESM chunk ("non-ecmascript placeable asset", confirmed live). Opting
  // both out of Server Component bundling makes Next.js `require()` them
  // natively at runtime instead, per pdf-parse's own documented Next.js
  // setup.
  //
  // @browserbasehq/stagehand (Feature 13) resolves its own package root at
  // runtime via `new URL("../", import.meta.url)` (to locate bundled
  // extension assets) — Turbopack's production build can't statically
  // resolve that once the package is bundled ("Module not found: Can't
  // resolve '../'", confirmed live). Same fix: exclude it from Server
  // Component bundling so Next.js requires it natively instead.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "@browserbasehq/stagehand"],
};

export default nextConfig;
