import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /** Evita empacotar scrapers/HTTP no bundle do servidor (Node resolve em runtime). */
  serverExternalPackages: ['@distube/ytsr', 'undici'],
};

export default nextConfig;
