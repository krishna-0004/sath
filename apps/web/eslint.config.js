import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      ...tsPlugin.configs["recommended"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "error",
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "localStorage",
          message: "Hard Rule 1: Never use localStorage. Tokens live only in httpOnly cookies.",
        },
        {
          object: "window",
          property: "sessionStorage",
          message: "Hard Rule 1: Never use sessionStorage. Tokens live only in httpOnly cookies.",
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "Hard Rule 1: Never use localStorage. Tokens live only in httpOnly cookies.",
        },
        {
          name: "sessionStorage",
          message: "Hard Rule 1: Never use sessionStorage. Tokens live only in httpOnly cookies.",
        },
      ],
    },
  },
];
