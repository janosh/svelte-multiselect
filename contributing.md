# Contributing

To submit a PR, clone the repo, install dependencies and start the dev server to see changes as you make them.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
pnpm install
pnpm dev
```

Before you start committing, make sure you moved to a new descriptively named branch:

```sh
git checkout -b <my-cool-new-feature>
```

To ensure your changes didn't break anything, run the full test suite (which also runs in CI) with:

```sh
pnpm test
```

Any new features should come with corresponding tests. If you fix a bug, please add a test that fails under the old code and passes with your changes. If you're having trouble writing tests, you can submit your PR anyway. Others might be able to help with tests but chances are your code will take longer to get merged.

## What can I help out with?

If you submitted a feature request and it got the green light, by all means implement it yourself. Or look for [issues labeled 'help wanted'](https://github.com/janosh/svelte-multiselect/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) and start working on those. If you don't finish but have a sizeable chunk of code, feel free to submit as draft PR anyway. Someone else might take over.

PRs don't always have to add functionality. If you have ideas for new examples or how to improve the docs, let's hear'em! Likewise new tests for existing functionality are always welcome.

## CI checks

This repo has 3 required CI checks that have to pass for every PR before merging:

- tests: run as [GitHub Action](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml) ([workflow code](.github/workflows/test.yml))
- linting: handled by [pre-commit.ci](https://results.pre-commit.ci/repo/github/365228700)
- docs: [continuous deployment](https://github.com/janosh/svelte-multiselect/deployments) through GitHub pages
