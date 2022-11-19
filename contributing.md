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
