export default {
  extends: ['@commitlint/config-conventional', '@commitlint/config-angular'],
  rules: {
    'header-max-length': [2, 'always', 200],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'chore'
      ]
    ]
  }
};
