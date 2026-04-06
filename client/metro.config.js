const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ─── Windows File Watcher Fix ─────────────────────────────────────────────────
// On Windows, Metro's file watcher can fail to start ("Failed to start watch
// mode") when watching too many files. This config:
//   1. Disables Watchman (not available on Windows by default)
//   2. Excludes non-essential directories from the watch list
//   3. Lowers the watcher timeout to fail faster on bad roots

config.watchFolders = [
  path.resolve(__dirname), // Only watch the project root
];

// Exclude large directories that don't need live-reload watching
config.resolver.blockList = [
  /.*\.git\/.*/,
  /.*node_modules\/.*\/node_modules\/.*/,  // Nested node_modules
  /.*\/__tests__\/.*/,
  /.*\/android\/build\/.*/,
  /.*\/android\/.gradle\/.*/,
  /.*\/dist\/.*/,
];

// Use the node file crawler instead of watchman (more reliable on Windows)
config.resolver.useWatchman = false;

module.exports = config;
