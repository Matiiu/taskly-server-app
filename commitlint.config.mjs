export default {
  // Start from the standard Conventional Commits rules: allowed types
  // (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test),
  // lowercase type, subject not empty, no period at the end, etc.
  extends: ['@commitlint/config-conventional'],

  // Your own rules on top. Each one is [level, when, value]:
  //   level: 2 = error (blocks the commit), 1 = warning, 0 = off
  //   when:  'always' = must be true, 'never' = must be false
  rules: {
    'header-max-length': [2, 'always', 72], // title max 72 chars (default is 100)
    'body-empty': [2, 'never'], // the body may never be empty: it's mandatory
    'body-leading-blank': [2, 'always'], // blank line between title and body (default is only a warning)
    'body-max-line-length': [2, 'always', 72], // body lines wrapped at 72 (default is 100)
  },
};