# kubelt/web3-publish

Kubelt is the easiest way to publish content on web3. This action uses our SDK
to publish your content to IPFS using our backend.

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
        uses: kubelt/web3-publish@v0-pre-alpha
        with:
          secret: ${{ secrets.NAME_PUBLISHING_KEY }}
          glob: "./data"
          published: true

      - run: echo '${{ steps.data.outputs.roots }}' >> output.js

      - name: Save output
        uses: actions/upload-artifact@v2
        with:
          name: output
          path: ./output.js
```

This workflow checks out the current repo and publishes its `data/` folder to
IPFS. You could also, for example, run a build here and publish `dist/`.

It then saves the results of the publishing action to a JSON file called
`output.js` as a build artifact (as a zipfile).

Commit the `.github` directory and the action will run. View the logs and the 
`output.zip` artifact to see results.

## API Reference

The key config values are `secret`, `glob`, and `published` here:

```yaml
      - name: Publish data/ folder to web3
        id: data
        uses: kubelt/web3-publish@v0-pre-alpha
        with:
          secret: ${{ secrets.NAME_PUBLISHING_KEY }}
          glob: "./data"
          published: true
```

- `secret` is a deterministically derived keypair used for authentication,
signature validation, and content naming. Currenly any string is accepted (use a
secure, long string stored from a password generator), but this will rapidly
tighten. To store `secret` securely (as above) use [Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets).
- `glob` is a [minimatch](https://github.com/isaacs/minimatch) pattern. All
files that match the pattern are named and published, currently.
- `published` is a boolean that controls whether the content is published to
IPFS. If `false` names and metadata are created. If `true` names and metadata
are created and the content is pinned on IPFS.

## `curl` Workflow

These examples use included test fixture data to illustrate the capabilities of
the publishing API by accessing it directly.

```bash
$ curl -X POST "https://pndo-worker.alfl-dev.workers.dev/v0/api/content/kbt/abc123" \
 -H "X-Public-Key: my_secret_key"  \
 -H "X-Signature: my_secret_key"   \
 -F file=@test/fixtures/unrevealed.car \
 -F metadata='{"published": false}'
```

The response will come back `{"expirationTtl":86400,"metadata":{"published":false,"box":{"cid":"unpublished"}}}`
which we pretty print (with `jq`):

```json
{
  "expirationTtl": 86400,
  "metadata": {
    "published": false,
    "box": {
      "cid": "unpublished"
    }
  }
}
```

Now we `curl` the name to see what we get back:

```bash
$ curl "https://pndo-worker.alfl-dev.workers.dev/v0/api/content/kbt/abc123"
```

Which returns:

```bash
unpublished
```

Now let's flip the `published` flag:

```bash
$ curl -X POST "https://pndo-worker.alfl-dev.workers.dev/v0/api/content/kbt/abc123" \
 -H "X-Public-Key: my_secret_key"  \
 -H "X-Signature: my_secret_key"   \
 -F file=@test/fixtures/unrevealed.car \
 -F metadata='{"published": true}'
```

Which we pretty print (with `jq`):

```json
{
  "expirationTtl": 86400,
  "metadata": {
    "published": true,
    "box": {
      "cid": "bafyreie634kmunayjxvzvvn7ajr7vym4nbr2s3um473a44li2b3sncgnra"
    }
  }
}
```

Now when we `curl` the name:

```bash
$ curl "https://pndo-worker.alfl-dev.workers.dev/v0/api/content/kbt/abc123"
```

We see:

```
bafyreie634kmunayjxvzvvn7ajr7vym4nbr2s3um473a44li2b3sncgnra
```

And we can chain calls to get the data directly out of IPFS:

```bash
$ curl "https://pndo-worker.alfl-dev.workers.dev/v0/api/content/kbt/abc123" | ipfs dag get | jq
```

Which pretty prints:

```json
{
  "description": "This is data that is published on IPFS as a placeholder for data to be revealed later.",
  "name": "Unrevealed Content"
}
```

Now we can publish new content addressed by the same name (`abc123` in this case):

```bash
$ curl -X POST "https://pndo-worker.alfl-dev.workers.dev/v0/api/content/kbt/abc123" \
 -H "X-Public-Key: my_secret_key"  \
 -H "X-Signature: my_secret_key"   \
 -F file=@test/fixtures/revealed.car \
 -F metadata='{"published": true}'
```

Note that the cid in the response has changed. With the same call as above:

```bash
$ curl "https://pndo-worker.alfl-dev.workers.dev/v0/api/content/kbt/abc123" | ipfs dag get | jq
```

Which pretty prints:

```json
{
  "name": "Revealed Content",
  "description": "This is data that is published on IPFS. This is the revealed content.",
  "bayc": {
    "id": 5383,
    "name": "Bored Ape YC #5383",
    "trait_count": 6,
    "traits": [
      {
        "trait": "background",
        "value": "PSA 10"
      },
      {
        "trait": "fur",
        "value": "Solid Gold"
      },
      {
        "trait": "hat",
        "value": "Army Hat"
      },
      {
        "trait": "clothes",
        "value": "Lumberjack Shirt"
      },
      {
        "trait": "eyes",
        "value": "Angry"
      },
      {
        "trait": "mouth",
        "value": "Bored Unshaven"
      },
      {
        "trait": "earring",
        "value": "none"
      }
    ]
  }
}
```

The `abc123` stable name has now been re-linked to new data. Enjoy your Bored Ape!

## Support

Contact [alex@kubelt.com](mailto:alex@kubelt.com) for questions and suggestions.
