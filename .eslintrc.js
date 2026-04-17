module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    jest: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "no-console": "off",
    "no-case-declarations": "off",
    "no-unused-vars": "off",
    "import/no-unresolved": "off",
    "import/prefer-default-export": "off",
    "import/order": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
  overrides: [
    {
      files: ["*.js", "*.cjs"],
      env: {
        node: true,
      },
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".cjs", ".ts"],
      },
      typescript: {
        project: ["./packages/*/tsconfig.json"],
      },
    },
  },
};
