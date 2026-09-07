import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (Feature 07) pulls in @napi-rs/canvas, which ships a native
  // .node binding — Turbopack's production build can't place that as an
  // ESM chunk ("non-ecmascript placeable asset", confirmed live). Opting
  // both out of Server Component bundling makes Next.js `require()` them
  // natively at runtime instead, per pdf-parse's own documented Next.js
  // setup.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
