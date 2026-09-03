import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.16.10.139'],
  output: "standalone",
};

export default nextConfig;
