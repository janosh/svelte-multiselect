# Contributing

## 🙋 What can I help out with?

If you submitted a feature request and it got the green light, by all means implement it yourself. Or look for [issues labeled 'help wanted'](https://github.com/janosh/svelte-multiselect/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) and start working on those. If you don't finish but have a sizeable chunk of code, feel free to submit as draft PR anyway. Someone else might take over.

PRs don't always have to add functionality. If you have ideas for new examples or how to improve the docs, let's hear'em! Likewise new tests for existing functionality are always welcome.

## 🚀 Submit a PR

To submit a pull request, clone the repo, install dependencies and start the dev server to see changes as you make them.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
pnpm install
pnpm dev
```

Before you start committing, make sure you checked out a new descriptively named branch:

```sh
git checkout -b <my-cool-new-feature>
```

To ensure your changes didn't break anything, run the full test suite (which also runs in CI):

```sh
pnpm test
```

Any new features should come with corresponding tests. If you fix a bug, please add a test that fails under the old code and passes with your changes. If you're having trouble writing tests, you can submit your PR anyway. Others might be able to help with tests but chances are your code will take longer to get merged.

## ✅ CI checks

This repo has 3 required CI checks that have to pass for every PR before merging:

- tests: run as [GitHub Action](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml) ([workflow code](https://github.com/janosh/svelte-multiselect/blob/main/.github/workflows/test.yml))
- linting: handled by [pre-commit.ci](https://results.pre-commit.ci/repo/github/365228700)
- docs: [continuous deployment](https://github.com/janosh/svelte-multiselect/blob/main/.github/workflows/gh-pages.yml) through GitHub Pages

## 🆕 New release

To make a release, increase the `"version"` field in `package.json`. This package (mostly) follows semantic versioning, meaning

- `v[x.y.z] -> v[x+1.y.z]`: major release with breaking changes
- `v[x.y.z] -> v[x.y+1.z]`: minor release with new features
- `v[x.y.z] -> v[x.y.z+1]`: patch release with bug fixes

Now run the `changelog` script from `package.json` to update `changelog.md`, then commit both files to the `main` branch using the new version number prefixed by `'v'` as commit message and tag:

```sh
pnpm changelog  # or npm run changelog
git add package.json changelog.md
git commit -m vx.y.z
git tag $(git log -1 --pretty=%B)
```

Push the release commit and tag to `origin/main`:

```sh
git push && git push --tags
```

Finally [publish a new release on GitHub](https://github.com/janosh/svelte-multiselect/releases/new).
