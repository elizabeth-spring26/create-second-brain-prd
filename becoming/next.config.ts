import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * libSQL ships a native/Node client whose package contains non-JS files the
   * bundler tries to parse. Keep it external so it's required at runtime.
   */
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client"],
};

export default nextConfig;
