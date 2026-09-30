const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Migraciones de Drizzle.
config.resolver.sourceExts.push('sql');

module.exports = config;
