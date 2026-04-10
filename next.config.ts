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
  bundlePagesRouterDependencies: true,
};

export default nextConfig;
