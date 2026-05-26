import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — cocok untuk Electron & Capacitor (tanpa Next server runtime)
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
