const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/**", "coverage/**", "scratch/**"] },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }],
    },
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: ["**/__tests__/**/*.js"],
    languageOptions: { globals: globals.jest },
  },
];
