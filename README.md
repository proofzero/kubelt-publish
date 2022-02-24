# web3-publish

Kubelt is the easiest way to publish content on web3. This action uses our SDK
to publish your content to IPFS using our backend. [Join us on Matrix](https://matrix.to/#/#lobby:matrix.kubelt.com) for questions and suggestions.

To register, contact [founders@kubelt.com](mailto:founders@kubelt.com).

## Quickstart

Follow these steps to create a workflow that pushes your content to IPFS. See 
the [GitHub Actions Quickstart](https://docs.github.com/en/actions/quickstart)
for more information.

In your repo create a `workflow` directory under the `.github` directory:

```bash
$ mkdir -p .github/workflow
```

In the `workflow` directory create a yaml file (for example `build.yaml`) with
these contents:

```yaml
---
name: web3 Publish

on:  # yamllint disable-line rule:truthy
  push:
    branches:
      - main
    tags:
      - '*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repo
        uses: actions/checkout@v2

      - name: Publish data/ folder to web3
        id: data
        uses: kubelt/web3-publish@v1-pre-alpha
        with:
          secret: ${{ secrets.NAME_PUBLISHING_KEY }}
          glob: "./data"
          as: "dir"
          published: true

      - run: echo '${{ steps.data.outputs.roots }}' >> output.js

      - name: Save output
        uses: actions/upload-artifact@v2
        with:
          name: output
          path: ./output.js
```

This workflow checks out the current repo and publishes its `data/` folder to
IPFS. You could also, for example, run a build here and publish `dist/`. It then
saves the results of the publishing action to a JSON file called `output.js` as
a build artifact (as a zipfile).

Commit the `.github` directory and the action will run. View the logs and the 
`output.zip` artifact to see results.

## API Reference

```yaml
      - name: Publish data/ folder to web3
        id: data
        uses: kubelt/web3-publish@v0-pre-alpha
        with:
          secret: ${{ secrets.NAME_PUBLISHING_KEY }}
          glob: "./data"
          as: "dag"
          published: true
```

- `secret` is a deterministically derived keypair used for authentication,
signature validation, and content naming. Currenly any string is accepted (use a
secure, long string stored from a password generator), but this will rapidly
tighten. To store `secret` securely (as it is above) use [Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets).

- `glob` is a [minimatch](https://github.com/isaacs/minimatch) pattern. All
files and directories that match the pattern are named and published.

- `name` allows you to specify a unique identifier for your content. Currently
only `'path'` is supported, and indicates filepath is a unique identifier (specifically,
[basename](https://nodejs.org/api/path.html#pathbasenamepath-ext)).

- `as` is an enum field, one of `"dag"`, `"file"`, `"dir"`, or `"wrap"`, that lets you
specify what kind of content you're uploading. Default is `"dag"` which stores file
contents as DAGs, use `"file"` if you want to store files themselves (as opposed
to their contents). Use `"dir"` to upload directory contents and `"wrap"` to
upload the directory containing ("wrapping") those contents (e.g. do you want to
upload `data`, the wrapping directory, or `data/*`, its contents).

The `"dag"` option lets you store data structures, e.g. JSON objects, directly
into our graph.

- `published` is a boolean that controls whether the content is published to
IPFS. If `false` names and metadata are created. If `true` names and metadata
are created and the content is pinned on IPFS.

- `skip` is a boolean that tells us to skip key generation, treat `secret`
as a base64-encoded key exported directly from go-ipfs, and use it for publishing.
This is useful for migrating already-published names to Kubelt.

- `core` is the name of your custom core (default is ours: `kbt`). For now, think
of cores as namespaces. Within a core, specified `name`s are considered unique.
Contact us to create your core.

- `domain` is the name (CNAME) of your custom domain. Contact us to create this.

## `curl` Workflow

Coming soon -- the API has changed. See history for a legacy workflow using `curl`.

