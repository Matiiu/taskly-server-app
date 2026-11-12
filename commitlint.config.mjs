// Squash commits created before commitlint existed. They're already in develop/main
// and can't be renamed without rewriting history, so commitlint skips them.
const LEGACY_SQUASH_TITLES =
  /^(Develop|Test\/coverage thresholds|Fix\/build excludes tests|Chore\/ci workflow) \(#\d+\)/;

export default {
  // Start from the standard Conventional Commits rules: allowed types
  // (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test),
  // lowercase type, subject not empty, no period at the end, etc.
  extends: ['@commitlint/config-conventional'],

  // Skip the legacy squash commits above.
  ignores: [(message) => LEGACY_SQUASH_TITLES.test(message)],

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