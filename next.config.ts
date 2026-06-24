import type { NextConfig } from "next";

const devOrigins = process.env.WEB_DEV_ORIGIN
  ? process.env.WEB_DEV_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

function mediaPattern(baseUrl: string | undefined, pathname: string) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname,
    };
  } catch {
    return null;
  }
}

const imageRemotePatterns = [
  mediaPattern(process.env.NEXT_PUBLIC_IAM_BASE_URL ?? "https://akademiq.dev.sby.test", "/api/v1/iam/media/**"),
  mediaPattern(process.env.NEXT_PUBLIC_BILLING_BASE_URL ?? "https://akademiq.dev.sby.test", "/api/v1/billing/media/**"),
  mediaPattern(process.env.NEXT_PUBLIC_ACADEMIC_OPS_BASE_URL ?? "https://akademiq.dev.sby.test", "/api/v1/academic-ops/media/**"),
].filter((pattern): pattern is NonNullable<typeof pattern> => pattern !== null);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: imageRemotePatterns,
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
