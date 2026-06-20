import type { NextConfig } from "next";

const devOrigins = process.env.WEB_DEV_ORIGIN
  ? process.env.WEB_DEV_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "akademiq.dev.sby.test",
        pathname: "/api/v1/iam/media/**",
      },
    ],
  },
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
