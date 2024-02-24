/** @type {import('next').NextConfig} */
const nextConfig = {
  // need to be test on CI but not on building of the app
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
