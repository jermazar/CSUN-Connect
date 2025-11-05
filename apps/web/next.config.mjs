/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1️⃣ Tell Next to transpile your workspace packages (important for monorepos)
  transpilePackages: ["@campus/data"],

  // 2️⃣ Keep your existing React Native alias
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
    };
    return config;
  },
};

export default nextConfig;

