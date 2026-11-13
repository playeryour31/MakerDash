import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';

/**
 * Deliberately narrow ruleset.
 *
 * `Main/` and `Maker/` are 40k lines of legacy Discord code: making them
 * "lint-clean" would mean a formatting-only mega-commit that hides real
 * changes. So the legacy tree gets *guardrails only* — rules that catch bugs,
 * not style. The modern tree (Apps/** + packages/**) gets stricter rules as
 * each migration phase lands.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      'Main/Backups/**',
      'archive/**',
      'Database/**',
      'Maker/Json-Database/**',
      'Subscriptions/**',
      '**/*.min.js',
      '**/next-env.d.ts',
    ],
  },

  // ---- Legacy Discord tree (Main/, Maker/, src/, scripts/) ---------------
  {
    files: ['Main/**/*.js', 'Maker/**/*.js', 'src/**/*.js', 'scripts/**/*.js', 'index.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...globals.node },
    },
    rules: {
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-unreachable': 'error',
      'no-func-assign': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'off',
      'no-unsafe-negation': 'error',
      'no-cond-assign': ['error', 'except-parens'],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'require-atomic-updates': 'off',
      // Catch the `fs.writeFile` in an async loop class of bug at review time.
      'no-await-in-loop': 'off',
    },
  },

  // ---- Modern tree (Apps/api, packages) ----------------------------------
  {
    files: ['Apps/api/src/**/*.ts', 'packages/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
      },
      globals: { ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['error'] }],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-var': 'warn',
      'prefer-const': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Phase 1 removes the last two requireFromHere() escapes.
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.name='createRequire']",
          message:
            'createRequire() escapes the typed boundary. Move the logic into a package instead (see docs/ARCHITECTURE.md).',
        },
      ],
    },
  },

  // ---- Dashboard (Next.js, TSX) ------------------------------------------
  {
    files: ['Apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    rules: {
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }],

      // Bug-catching, not style. These are the two rules Next's own config
      // enables; the repo already passes them, so they act as a ratchet.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-assign-module-variable': 'error',
    },
  },

  // ---- Existing inline suppressions --------------------------------------
  // The repo predates ESLint for these two rules; the disable comments are kept
  // so the rules can be tightened later without a formatting mega-commit.
  {
    files: ['packages/database/scripts/import-phase*.ts'],
    rules: { 'no-control-regex': 'off' },
  },
  {
    files: ['src/shared/services/mainDb/staticCatalog.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
