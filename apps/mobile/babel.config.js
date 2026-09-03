module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // babel-preset-expo wires up expo-router and react-native-worklets/reanimated.
  };
};
