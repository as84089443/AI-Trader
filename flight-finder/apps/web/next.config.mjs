/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the workspace TS packages instead of expecting prebuilt JS.
  transpilePackages: ["@flight-finder/core", "@flight-finder/fixtures"],
};

export default nextConfig;
