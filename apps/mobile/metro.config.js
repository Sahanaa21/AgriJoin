// Metro config for an npm-workspaces monorepo.
// Lets Metro resolve the hoisted root node_modules and watch the shared package.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Keep Expo's defaults and add the workspace root + its node_modules so Metro
// can resolve the hoisted dependencies and the @agrijoin/shared package.
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
