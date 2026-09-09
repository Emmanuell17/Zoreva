import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Avoid picking a parent lockfile as the Turbopack root (breaks env loading).
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      { source: "/manager", destination: "/admin", permanent: false },
      { source: "/manager/shifts", destination: "/admin/shifts", permanent: false },
      { source: "/manager/swaps", destination: "/admin/hours", permanent: false },
      { source: "/manager/availability", destination: "/admin/shifts", permanent: false },
      { source: "/manager/employees", destination: "/admin", permanent: false },
      { source: "/manager/:path*", destination: "/admin", permanent: false },
      { source: "/employee/availability", destination: "/employee/choose", permanent: false },
      { source: "/employee/shifts", destination: "/employee/schedule", permanent: false },
      { source: "/employee/swaps", destination: "/employee/hours", permanent: false },
      { source: "/employee/notifications", destination: "/employee/reminders", permanent: false },
    ];
  },
};

export default nextConfig;
