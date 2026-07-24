const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for react-leaflet ESM module resolution (fully specified paths)
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;
