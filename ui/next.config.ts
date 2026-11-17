/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/upload',
        destination: 'http://localhost:8080/upload',
      },
      {
        source: '/api/download/:port',
        destination: 'http://localhost:8080/download/:port',
      },
      {
        source: '/api/status/:port',
        destination: 'http://localhost:8080/status/:port',
      },
    ];
  },
}

module.exports = nextConfig