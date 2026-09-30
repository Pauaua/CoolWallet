module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Las migraciones de Drizzle (.sql) se incrustan como strings en el bundle.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
