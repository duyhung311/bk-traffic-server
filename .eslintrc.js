module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 11,
  },
  rules: {
    camelcase: 1,
    'no-continue': 1,
    'no-underscore-dangle': 0,
    'no-param-reassign': 1,
    'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
    'max-len': [
      'error',
      {
        'code': 120,
        'ignoreComments': true,
      }
    ]
  },
};
