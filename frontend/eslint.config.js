const { defineConfig, globalIgnores } = require("eslint/config");
const nextVitals = require("eslint-config-next/core-web-vitals");
const nextTs = require("eslint-config-next/typescript");
const prettier = require("eslint-config-prettier/flat");

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([
    "eslint.config.js",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

module.exports = eslintConfig;
