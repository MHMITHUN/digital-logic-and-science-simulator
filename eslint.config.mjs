import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config. eslint-config-next 16 ships native flat-config arrays,
 * so no FlatCompat translation is needed; eslint is intentionally
 * pinned to ^9.39.0 — see README (do not upgrade to 10).
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
