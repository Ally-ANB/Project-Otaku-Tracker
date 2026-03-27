import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /** Evita empacotar scrapers/HTTP no bundle do servidor (Node resolve em runtime). */
  serverExternalPackages: ['@distube/ytsr', '@distube/ytpl', 'undici'],
};

export default nextConfig;
