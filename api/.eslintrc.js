module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    "prettier/prettier": "off",
    // ===================================
    // REGLAS DE ARQUITECTURA DE 3 CAPAS
    // ===================================
    
    'no-restricted-imports': ['error', {
      patterns: [
        {
          // Controllers NO pueden importar de access
          group: ['**/access/**', '../access/**', '../../access/**'],
          message: '❌ Controllers cannot import from access layer. Use manager services instead.'
        },
        {
          // Host NO puede importar de access directamente
          group: ['**/access/**'],
          message: '❌ Host layer cannot import from access layer. Use manager services instead.'
        }
      ]
    }],

    // Regla adicional para imports específicos por carpeta
    'no-restricted-syntax': [
      'error',
      {
        // En archivos de host/controllers, no permitir imports de access
        selector: "ImportDeclaration[source.value=/access/]",
        message: '❌ Controllers cannot import access services. Use managers instead.'
      }
    ]
  },
  
  // Sobrescribir reglas por ubicación de archivo
  overrides: [
    {
      // Reglas específicas para CONTROLLERS
      files: ['**/host/controllers/**/*.ts', '**/host/services/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['**/access/**', '../../access/**', '../../../access/**'],
              message: '❌ [CONTROLLER LAYER] Cannot import access services. Only managers allowed.'
            }
          ]
        }]
      }
    },
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
  ]
};
