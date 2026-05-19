/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Allow serving from storage folder
  async rewrites() {
    return [
      { source: '/storage/:path*', destination: '/api/storage/:path*' },
    ];
  },
};

export default nextConfig;
