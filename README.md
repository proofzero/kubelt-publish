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

- `core` is the name of your custom core (default is ours: `kbt`). For now, think
of cores as namespaces. Within a core, specified `name`s are considered unique.
Contact us to create your core.

- `domain` is the name (CNAME) of your custom domain. Contact us to create this.

## API Workflow

Let's publish some content and then query it back through the headless API using
`curl` to see how it all works.

### Publishing

First we publish a simple piece of content. To validate that we're allowed to do
this we sign the request. For now, because we're using keys packed in a format
native to IPFS, we use the `libp2p-crypto` library to unmarshal the key.

**Note!** If you need a publishing key please [contact us](mailto:alex@kubelt.com).

**Note!** This file is available in `test/docs.js`.

```javascript
const crypto = require('libp2p-crypto')
const fetch  = require('node-fetch')

async function sample() {
    // We get the secret key from the environment or other secret storage.
    const base64_encoded_key = process.env['MY_SECRET_PUBLISHING_KEY']

    // Keys used, for example, as a GitHub Secret are base64 encoded.
    const marshalled_key = Buffer.from(base64_encoded_key, 'base64')

    // IPFS-generatetd keys are stored marshalled into a protocol buffer.
    const secret_key = await crypto.keys.unmarshalPrivateKey(marshalled_key)

    // This is the content we want to publish.
    const body = {"hello": "world"}

    // We prepare a fetch options payload.
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
        },
        body: JSON.stringify(body),
    }

    // Sign the body and send in a header.
    const body_buffer = Buffer.from(options.body)
    const sig = await secret_key.sign(body_buffer)
    options.headers['x-signature'] = Buffer.from(sig).toString('base64')

    // Tell us what public key you're authenticated with. We'll validate this on our end.
    const public_key = secret_key.public
    const marshalled_pk = await crypto.keys.marshalPublicKey(public_key)
    const base64_pub_key = marshalled_pk.toString('base64')
    options.headers['x-public-key'] = base64_pub_key

    // Set up your core and content address. If you need a core contact alex@kubelt.com.
    const core = 'test'
    const address = 'my_content_name'

    // Set up your publishing metadata header. See "API Reference", above, for values.
    const metadata = {
        published: true,
        as: "dag",       // ALPHA: "dag" is currently the only supported value.
    }
    options.headers['x-metadata'] = JSON.stringify(metadata)

    const result = await fetch(`https://staging.pndo.xyz/v0/api/content/${core}/${address}`, options)
    console.log(await result.text())
}

sample()
```

This yields:

```
{"metadata":{"published":true,"as":"dag","box":{"cid":"bafyreidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae","name":"/test/my_content_name"}}}
```

Which contains the content's name, address, and some metadata about it.

### Querying

Now we can query it back simply:

```bash
export CORE=test
export NAME=my_content_name
curl https://api.pndo.xyz/v0/api/content/$CORE/$NAME -v
```
