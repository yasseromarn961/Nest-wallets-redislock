// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  // Detect hard-coded messages in Exceptions/response objects within src only
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "NewExpression[callee.name=/.*Exception$/][arguments.length>0][arguments.0.type='Literal']",
          message:
            'Do not pass hard-coded strings to NestJS Exceptions. Use i18n.t(...) instead.',
        },
        {
          selector:
            "NewExpression[callee.name=/.*Exception$/][arguments.length>0][arguments.0.type='TemplateLiteral'][arguments.0.expressions.length=0]",
          message:
            'Do not pass hard-coded template strings to NestJS Exceptions. Use i18n.t(...) instead.',
        },
        {
          selector:
            "ThrowStatement > NewExpression[callee.name='Error'][arguments.length>0][arguments.0.type='Literal']",
          message:
            'Do not throw Error with hard-coded messages. Use NestJS exceptions with i18n.t(...) instead.',
        },
        {
          selector:
            "ThrowStatement > NewExpression[callee.name='Error'][arguments.length>0][arguments.0.type='TemplateLiteral'][arguments.0.expressions.length=0]",
          message:
            'Do not throw Error with hard-coded template strings. Use NestJS exceptions with i18n.t(...) instead.',
        },
        {
          selector:
            "Property[key.name='message'][value.type='Literal']",
          message:
            "Do not hard-code 'message' fields in responses. Use i18n.t(...) for localized messages.",
        },
        {
          selector:
            "Property[key.name='message'][value.type='TemplateLiteral'][value.expressions.length=0]",
          message:
            "Do not hard-code 'message' fields in responses. Use i18n.t(...) for localized messages.",
        },
      ],
    },
  },
);
