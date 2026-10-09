const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// Resolve the physical canonical path to avoid virtual/subst drive letter mismatches on Windows
let projectRoot = __dirname;
try {
  projectRoot = fs.realpathSync.native(__dirname);
} catch (_) {}

const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  projectRoot,
  watchFolders: [projectRoot],
  resolver: {
    blockList: [
      /[\\/\\\\]android[\\/\\\\].*/,
      /[\\/\\\\]ios[\\/\\\\].*/,
    ].concat(defaultConfig.resolver.blockList || []),
  },
};

module.exports = mergeConfig(defaultConfig, config);

