/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'htface-kr-1305865668.file.myqcloud.com',
        port: '',
        pathname: '/img/face/**',
      },
    ],
  },
};

export default nextConfig;
