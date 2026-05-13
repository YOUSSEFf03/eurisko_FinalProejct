module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce the exact types from the assignment spec
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'refactor', 'docs', 'test'],
    ],
    // Enforce scopes matching service names
    'scope-enum': [
      1, // warn only — don't block hotfixes with no scope
      'always',
      [
        'auth',
        'wallet',
        'stocks',
        'orders',
        'analytics',
        'notifications',
        'cms',
        'gateway',
        'kafka',
        'docker',
        'deps',
        'postman',
        'readme',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
    'header-max-length': [2, 'always', 100],
  },
};
