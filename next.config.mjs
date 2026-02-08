/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.groupme.com' },
      { protocol: 'https', hostname: 'image.groupme.com' },
    ],
  },
};

export default nextConfig;
