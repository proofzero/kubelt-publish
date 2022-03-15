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
