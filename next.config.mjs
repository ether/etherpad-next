/** @type {import('next').NextConfig} */


const nextConfig = {
  // need to be test on CI but not on building of the app
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
