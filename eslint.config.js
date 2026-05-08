import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import globals from 'globals';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import stylistic from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import-x';
import { defineConfig } from 'eslint/config';

export default defineConfig(
[  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        ...globals.browser,
        ...globals.jest,
      },
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    plugins: {
      unicorn: eslintPluginUnicorn,
      '@stylistic': stylistic,
      import: importPlugin,
    },
    processor: angular.processInlineTemplates,
    rules: {
      // angular
      '@angular-eslint/no-lifecycle-call': 'error',
      '@angular-eslint/consistent-component-styles': 'warn',
      '@angular-eslint/prefer-signals': 'warn',
      '@angular-eslint/prefer-output-readonly': 'warn',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      // ts
      '@typescript-eslint/member-ordering': [
        2,
        {
          default: [
            'signature',
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'public-constructor',
            'protected-constructor',
            'private-constructor',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
            'public-static-method',
            'protected-static-method',
            'private-static-method',
          ],
          classes: [
            'signature',
            'private-field',
            'public-field',
            'protected-field',
            'constructor',
            'public-get',
            'public-method',
            'public-set',
            'protected-method',
            'protected-get',
            'protected-set',
            'private-method',
            'private-get',
            'private-set',
          ],
        },
      ],
      '@typescript-eslint/no-useless-constructor': ['error'],
      '@typescript-eslint/array-type': ['error', { default: 'array', readonly: 'array' }],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { ignoredMethodNames: ['constructor', 'transform'] },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
      ],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-empty-interface': 'error',
      // common
      curly: ['error', 'all'],
      complexity: ['error', 20],
      'max-classes-per-file': ['error', 1],
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-confusing-arrow': ['error', { allowParens: true }],
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          allowSeparatedGroups: true,
        },
      ],
      'no-implicit-coercion': ['error', { allow: ['!!'] }],
      eqeqeq: ['error', 'always'],
      // import
      'import/extensions': [
        'error',
        {
          ts: 'never',
          config: 'off',
          routes: 'off',
          model: 'off',
          pipe: 'off',
          directive: 'off',
          service: 'off',
          component: 'off',
          resolver: 'off',
          mock: 'off',
          fixture: 'off',
          token: 'off',
          facade: 'off',
        },
      ],
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'import/no-cycle': ['error', { maxDepth: Infinity }],
      'import/first': 'error',
      // stylistic
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let'],
          next: ['const', 'let'],
        },
        { blankLine: 'always', prev: ['case', 'default'], next: '*' },
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
      ],
      // unicorn
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/number-literal-case': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            acc: true,
            env: true,
            i: true,
            j: true,
            props: true,
            Props: true,
            args: true,
            ImportMetaEnv: true,
          },
        },
      ],
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            kebabCase: true,
          },
        },
      ],
    },
  },
  {
    files: ['**/*.mock.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angular.templateParser,
    },
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/cyclomatic-complexity': ['warn', { maxComplexity: 10 }],
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'warn',
    },
  }]
);
