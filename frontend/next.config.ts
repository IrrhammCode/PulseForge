import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Playwright E2E + dev access via 127.0.0.1 */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /** Tree-shake icon/chart imports — avoids missing vendor-chunks in dev HMR */
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  /** More stable chunk IDs in dev — reduces "reading 'call'" webpack mismatches */
  webpack: (config, { dev }) => {
    if (dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: "named",
        chunkIds: "named",
      };
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "s.mxmcdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s.mxmcdn.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;