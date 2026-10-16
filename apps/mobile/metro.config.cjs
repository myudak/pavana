// Expo detects the pnpm workspace and resolves shared source packages automatically.
const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);
