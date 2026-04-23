const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@splinetool/react-spline'],
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config) => {
    config.resolve.alias['@splinetool/react-spline'] = path.resolve(__dirname, 'node_modules/@splinetool/react-spline/dist/react-spline.js');
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
