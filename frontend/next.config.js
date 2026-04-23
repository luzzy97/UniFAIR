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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || 'CG-vg5m6nnVU6EsxaAwAKy7TQPv',
  },
};

module.exports = nextConfig;
