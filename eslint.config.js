// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

const nodeGlobals = {
  module: "readonly",
  require: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  process: "readonly",
  console: "readonly",
  exports: "writable",
};

const appGlobals = {
  console: "readonly",
  process: "readonly",
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  fetch: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  localStorage: "readonly",
  requestAnimationFrame: "readonly",
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.expo/**",
      "**/coverage/**",
      "**/node_modules/**",
      "apps/web/src/App.jsx",
      "apps/watch/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React / hooks — both plain JS and TS sources
  {
    files: ["apps/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: appGlobals,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },

  // Shared TS rules
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },

  // Config files run in CommonJS Node
  {
    files: ["**/*.config.{js,cjs}", "**/babel.config.js", "**/metro.config.js"],
    languageOptions: { sourceType: "commonjs", globals: nodeGlobals },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
    },
  },

  prettier,
);
