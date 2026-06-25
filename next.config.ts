import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "beyblade.takaratomy.co.jp" },
    ],
  },
};

export default nextConfig;
