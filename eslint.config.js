import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // The data layer boundary: only DataProvider (and tests) may touch the mock implementations.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/data/DataProvider.tsx',
      'src/data/mock/**',
      'src/data/supabase/**',
      '**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Supabase is only used inside src/data/supabase.',
            },
          ],
          patterns: [
            {
              group: ['**/supabase', '**/supabase/**'],
              message:
                'Only DataProvider.tsx may import the Supabase implementation. Use the repository interfaces and hooks.',
            },
            {
              group: ['**/mock', '**/mock/**'],
              message:
                'Import repository interfaces from @/data/repositories and use hooks. Only DataProvider.tsx may import the mock implementations.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['vite.config.ts', 'tailwind.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
