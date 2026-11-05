// ESLint 9 (flat config). Reemplaza al .eslintrc.js legacy manteniendo sus reglas.
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.js'],
  },
  ...tsPlugin.configs['flat/recommended'],
  prettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': 'off'
    },
  },

  // ===================================
  // REGLAS DE ARQUITECTURA DE 3 CAPAS
  // ===================================
  // host → manager → access: cada capa solo importa de la de abajo
  {
    // HOST (controllers y servicios de host): nunca importa de access, ni con import directo
    files: ['**/host/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/access/**', '../access/**', '../../access/**', '../../../access/**'],
            message: '❌ [HOST LAYER] Cannot import from access layer. Use manager services instead.'
          }
        ]
      }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/access/]',
          message: '❌ [HOST LAYER] Cannot import access services. Use managers instead.'
        }
      ]
    }
  },
  // Sobrescribir reglas por ubicación de archivo
  {
    // Reglas específicas para MANAGERS
    files: ['**/manager/services/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/host/**'],
            message: '❌ [MANAGER LAYER] Cannot import from host/controller layer.'
          }
        ]
      }]
    }
  },
  {
    // Reglas específicas para ACCESS
    files: ['**/access/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/host/**', '**/manager/**'],
            message: '❌ [ACCESS LAYER] Cannot import from host or manager layers. Access is the lowest layer.'
          }
        ]
      }]
    }
  }
];
