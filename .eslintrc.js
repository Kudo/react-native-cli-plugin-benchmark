const prettierConfig = require('./.prettierrc');

module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    '@react-native-community',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
  },
  settings: {
    react: {
      version: 'latest',
    },
  },
  overrides: [
    {
      files: [
        '**/__mocks__/**',
        '**/__fixtures__/**',
        '**/__e2e__/**',
        'jest/**',
      ],
      env: {
        jest: true,
      },
    },
    {
      files: ['*.ts', '**/*.ts'],
      rules: {
        'prettier/prettier': [2, {prettierConfig, parser: 'typescript'}],
      },
    },
  ],
};
