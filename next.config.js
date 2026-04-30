/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'snowmentum.live' }],
        destination: '/newspaper?vol=1&issue=1',
      },
      {
        source: '/',
        has: [{ type: 'host', value: 'www.snowmentum.live' }],
        destination: '/newspaper?vol=1&issue=1',
      },
    ]
  },
}

module.exports = nextConfig
