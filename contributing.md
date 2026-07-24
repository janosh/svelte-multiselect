# Contributing

## 🙋 How can I help?

Pull requests to improve docs, test coverage, or examples are welcome. Before implementing a new feature, submit an issue to discuss project fit. The [issues labeled `help wanted`](https://github.com/janosh/svelte-multiselect/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) are also available for contributions. Incomplete work can be submitted as a draft PR for others to continue.

## 🚀 Submit a PR

To submit a pull request, clone the repo, install dependencies and start the dev server to see changes as you make them.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
npm install
npm run dev
```

Before you start committing, create and check out a descriptively named branch:

```sh
git checkout -b my-cool-new-feature
# or
git checkout -b docs-on-something
# or
git checkout -b test-some-feature
```

To ensure your changes didn't break anything, run the full test suite (which also runs in CI):

```sh
npm test
```

New features should include corresponding tests. Bug fixes should include a test that fails under the old code and passes with the change. PRs without tests are accepted when assistance is needed, but may take longer to merge.

## ✅ CI checks

This repo has 3 required CI checks that have to pass for every PR before merging:

- tests: run as [GitHub Action](https://github.com/janosh/svelte-multiselect/actions/workflows/test.yml) ([workflow code](https://github.com/janosh/svelte-multiselect/blob/main/.github/workflows/test.yml))
- linting: handled by `vp lint`
- docs: [continuous deployment](https://github.com/janosh/svelte-multiselect/blob/main/.github/workflows/gh-pages.yml) through GitHub Pages

## 🆕 New release

To make a release, increase the `"version"` field in `package.json`. This package follows semantic versioning, meaning

- `v[x.y.z] -> v[x+1.y.z]`: major release with breaking changes
- `v[x.y.z] -> v[x.y+1.z]`: minor release with new features
- `v[x.y.z] -> v[x.y.z+1]`: patch release with bug fixes

Now run the `changelog` script from `package.json` to update `changelog.md`.

```sh
npm run changelog
```

Then commit `package.json`, `changelog.md` and `readme.md` files to the `main` branch using the new version number prefixed by `'v'` as commit message and tag:

```sh
git add package.json changelog.md readme.md
git commit -m vx.y.z
git tag $(git log -1 --pretty=%B)
```

Push the release commit and tag to `origin/main`:

```sh
git push && git push --tags
```

Finally, [publish a new release on GitHub](https://github.com/janosh/svelte-multiselect/releases/new).
