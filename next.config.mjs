import specraConfig from "specra/next-config"

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...specraConfig,
  // Enable standalone output for Docker
  output: process.env.NEXT_BUILD_MODE === 'export' ? 'export' : 'standalone',
}

export default nextConfig
