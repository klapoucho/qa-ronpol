export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'test', 'fix', 'refactor', 'docs', 'build', 'ci', 'chore']],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [1, 'always', 72],
  },
};
