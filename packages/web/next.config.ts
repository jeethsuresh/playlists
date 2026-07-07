import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@playlists/shared", "@playlists/db"],
  output: "standalone",
};

export default nextConfig;
