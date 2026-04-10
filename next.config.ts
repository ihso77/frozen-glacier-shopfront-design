const nextConfig: any = {
  output: "export",
  distDir: "dist",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["lightningcss", "@tailwindcss/postcss", "@tailwindcss/node"],
};

export default nextConfig;
