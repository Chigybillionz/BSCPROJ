import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib', 'canvas'],
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'http',  hostname: '127.0.0.1' },
      { protocol: 'https', hostname: 'ltqyaavtoiqaibfcnnsj.supabase.co' },
      { protocol: 'https', hostname: 'uniclear-erog.onrender.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default nextConfig;
