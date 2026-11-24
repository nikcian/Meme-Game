import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', 'client/dist/**', 'server/data/**'] },

  js.configs.recommended,

  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Server, script e file di configurazione: ambiente Node.js
  {
    files: ['server/**/*.mjs', 'scripts/**/*.mjs', '*.config.js', 'client/vite.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
  },

  // Client React
  {
    files: ['client/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, allowExportNames: ['useAuth', 'usePreferences', 'useToast'] },
      ],
      // I componenti usati solo in JSX iniziano con la maiuscola.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  // Script classico caricato prima del bundle (tema)
  {
    files: ['client/public/**/*.js'],
    languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals: globals.browser },
  },
];
