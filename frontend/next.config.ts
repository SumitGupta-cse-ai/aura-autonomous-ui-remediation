import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://aura-autonomous-ui-remediation.onrender.com",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "wss://aura-autonomous-ui-remediation.onrender.com",
    VITE_API_URL: process.env.VITE_API_URL || "https://aura-autonomous-ui-remediation.onrender.com",
  },
};

export default nextConfig;
