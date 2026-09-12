/**
 * Metro resolves an image import to an asset handle; nothing told TypeScript so.
 *
 * These live here rather than in `expo-env.d.ts` because that file is generated
 * by Expo and gitignored — anything written into it is lost on regeneration and
 * never reaches CI, where the typecheck would then fail on every asset import.
 */
declare module "*.png" {
  import type { ImageRequireSource } from "react-native";
  const asset: ImageRequireSource;
  export default asset;
}

declare module "*.jpg" {
  import type { ImageRequireSource } from "react-native";
  const asset: ImageRequireSource;
  export default asset;
}
