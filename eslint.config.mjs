import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Keep in step with src/core/kit.ts.
const kits = ["keyframery"];
const onlyUiSdk = {
  group: ["@base-ui/*", "@radix-ui/*", "@ark-ui/*", "react-aria*"],
  message: "UI SDK is the only behaviour library; build controls from @ui-sdk/* parts.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [onlyUiSdk] }] },
  },
  {
    files: ["src/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            onlyUiSdk,
            { group: ["@/kits/*", "@/app/*"], message: "src/core is shared by every kit, so it can't import a kit or a route." },
          ],
        },
      ],
    },
  },
  {
    // Vendored from each kit's registry and kept as published, so a reinstall diffs cleanly.
    files: ["src/kits/*/ui/**"],
    rules: { "@typescript-eslint/no-empty-object-type": "off" },
  },
  ...kits.map((kit) => ({
    files: [`src/kits/${kit}/**`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            onlyUiSdk,
            { group: ["@/kits/*", `!@/kits/${kit}`], message: "A kit can't import another kit; share it through src/core." },
            { group: ["@/app/*"], message: "Kits don't import routes." },
          ],
        },
      ],
    },
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "convex/_generated/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
