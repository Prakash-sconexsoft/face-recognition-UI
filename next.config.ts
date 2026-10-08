import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://185.193.19.156:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;