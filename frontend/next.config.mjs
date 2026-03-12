/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.spock.replit.dev", "*.replit.dev"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
