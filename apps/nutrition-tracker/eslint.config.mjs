import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  { ignores: [".next/**", "next-env.d.ts"] },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Uploads sit behind auth, which the next/image optimizer can't forward.
      "@next/next/no-img-element": "off",
    },
  },
];
