import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

loadEnvConfig(path.join(__dirname));

const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();

const nextConfig: NextConfig = {
  // Hide the Next.js “N” badge in the corner during local development.
  devIndicators: false,
  // Avoid picking a parent lockfile as the Turbopack root (breaks env loading).
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    if (!firebaseAuthDomain) return [];
    // Same-origin Google redirect helper. A 302 would not work; this must proxy.
    return {
      beforeFiles: [
        {
          source: "/__/auth/:path*",
          destination: `https://${firebaseAuthDomain}/__/auth/:path*`,
        },
      ],
    };
  },
  async redirects() {
    return [
      { source: "/admin/shifts", destination: "/admin", permanent: false },
      { source: "/manager", destination: "/admin", permanent: false },
      { source: "/manager/shifts", destination: "/admin", permanent: false },
      { source: "/manager/swaps", destination: "/admin/hours", permanent: false },
      { source: "/manager/availability", destination: "/admin/availability", permanent: false },
      { source: "/manager/employees", destination: "/admin", permanent: false },
      { source: "/manager/:path*", destination: "/admin", permanent: false },
      { source: "/employee/shifts", destination: "/employee/schedule", permanent: false },
      { source: "/employee/swaps", destination: "/employee/hours", permanent: false },
      { source: "/employee/notifications", destination: "/employee/reminders", permanent: false },
    ];
  },
};

export default nextConfig;
