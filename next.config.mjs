/** @type {import('next').NextConfig} */

const nextConfig = {
  // need to be test on CI but not on building of the app
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // use to support old etherpad version
  rewrites: async () => [
    {
      source: '/socket.io/:path*',
      destination: '/socket/:path*',
    },
  ],
};

export default nextConfig;
