const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias || {}), 'react-native$': 'react-native-web' };
    return config;
  },
};
export default nextConfig;
