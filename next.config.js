/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  turbopack: { root: __dirname },
  async rewrites() {
    // Keep browser API calls same-origin so the HttpOnly session cookie works
    // without relying on third-party cookies being enabled.
    const apiOrigin = process.env.API_REWRITE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return [
      { source: "/health", destination: `${apiOrigin}/health` },
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
      ],
    }];
  },
};
module.exports = nextConfig;
