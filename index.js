const fs = require('fs')
const path = require('path')

const core = require('@actions/core')
const fetch = require('node-fetch')
const crypto = require('libp2p-crypto')
const FormData = require('form-data')
const { base36 } = require('multiformats/bases/base36')
const PeerId = require('peer-id')
const { CID } = require('multiformats/cid')

const util = require('util')
const glob = util.promisify(require('glob'))
const exec = util.promisify(require('child_process').exec)

async function getContentName(publishingKey, name) {
    const peer = await PeerId.createFromPrivKey(publishingKey.bytes)
    const peerId = peer.toString()
    const cid = CID.parse(peerId)
    return cid.toString(base36)
}

async function getPublishingKey(secret, name) {
    // Get the key object out of the protobuf.
    const secretKey = crypto.keys.unmarshalPrivateKey(secret)

    // Sign the human name to seed the generation of a publishing key for it.
    const signature = await secretKey.sign(Buffer.from(name))

    // ed25519 seeds must be 32 bytes.
    const seedStartIndex = 0
    const seedLength = 32
    const seed = signature.slice(seedStartIndex, seedLength)

    // Return a 2048 bit ed25519 keypair with the above seed.
    const algo = 'ed25519'
    const bitwidth = 2048
    return crypto.keys.generateKeyPairFromSeed(algo, seed, bitwidth)
}

function getHumanName(namespec, filepath) {
    let name = ''
    // TODO: Currently namespec is only expected to be "path". Add other specs.
    // TODO: Should probably done inline with the "as" parameter handling.
    switch (namespec) {
        case "path":
            // Get the filename at the end of the passed path.
            const namebase = path.basename(filepath)
            // Strip off the extension and use this as the content name.
            name = namebase.substring(0, namebase.lastIndexOf('.'))
        break
        default:
            throw(`Unexpected namespec ${namespec}. Should be 'path'.`)
    }
    return name
}

async function start() {
    try {
        const secret = core.getInput('secret', { required: true })
        const globspec = core.getInput('glob', { required: true })
        const namespec = core.getInput('name', { required: false }) || 'path'
        const published = core.getBooleanInput('published', { required: false }) || false

        // Restrict the "as" parameter to either "dag", "file", "dir", or "wrap", defaulting to "dag".
        const as = (core.getInput('as', { required: false }).match("^dag$|^file$|^dir$|^wrap$") || ['dag'])[0]

        const roots = await glob(globspec).then(async files => {
            const roots = []
            for (let i = 0; i < files.length; i++) {
                
                const metadata = JSON.stringify({
                    "published": published,
                    "as": as,
                })

                const form = new FormData()

                const inodeStat = fs.lstatSync(files[i])

                if ("dag" == as) {
                    if (!inodeStat.isFile()) {
                        throw ('"dag" parameter requires a file, got: ', JSON.stringify(inodeStat))
                    }
                    // TODO: Make this call via SDK instead of CLI.
                    // TODO: Check failure to pack.
                    // TODO: When the `json` command lands, s/courtyard/json/.
                    const { stdin, stdout } = await exec(`node ${__dirname}/vendor/cli.js courtyard convert ${files[i]}`)
                    //options.body = fs.createReadStream('./output.car')
                    form.append('data', fs.createReadStream('./output.car'))
                } else if ("file" == as) {
                    if (!inodeStat.isFile()) {
                        throw ('"file" parameter requires a file, got: ', JSON.stringify(inodeStat))
                    }
                    //options.body = fs.createReadStream(files[i])
                    form.append('data', fs.createReadStream(files[i]))
                } else if ("dir" == as || "wrap" == as) {
                    if (!inodeStat.isDirectory()) {
                        throw ('"dir" parameter requires a directory, got: ', JSON.stringify(inodeStat))
                    }
                    // TODO: Use a secure upload key and do this client-side?
                    // TODO: Pack the directory by adding all the files to the body.
                    // TODO: What if there are duplicate names? Is there a path differentiator?
                    const { stdin, stdout } = await exec(`node ${__dirname}/node_modules/ipfs-car/dist/cjs/cli/cli.js --pack ${files[i]} --output output.car --wrapWithDirectory ${"wrap" == as}`)
                    form.append('data', fs.createReadStream('./output.car'))
                } else {
                    throw ('Invalid "as" parameter: ', as)
                }

                const options = {
                    method: 'POST',
                    headers: { // TODO 'Content-Type'?
                        ...form.headers,
                        'X-Metadata': metadata, // TODO: Check failure to encode.
                        'X-Public-Key': secret,
                        'X-Signature': secret, // Generate from key (sig of pubkey).
                    },
                }

                options.body = form

                const humanName = getHumanName(namespec, files[i])
                const publishingKey = await getPublishingKey(Buffer.from(secret, 'base64'), humanName)
                const contentName = await getContentNamme(publishingKey, humanName)

                // TODO: Send key to server?
                // Pack the key in a protobuf for transmission.
                const encodedKey = crypto.keys.marshalPrivateKey(publishingKey)
 
                // TODO: Calculate the name so we can build it into the URL.
                //const name = Buffer.from(sha256.hash(secret + files[i])).toString('hex')

                // TODO: Figure out how to make work with `act` for local dev.
                //const url = new URL(name, 'http://127.0.0.1:8787/v0/api/content/kbt/')
                const url = new URL(contentName, 'https://api.pndo.xyz/v0/api/content/kbt/')
                //console.log(url)

                // Push the CID into the roots list.
                responseBody = await fetch(url, options).then(response => response.json())
                responseBody.metadata.box.name = `/kbt/${contentName}`
                //console.log(responseBody)
                roots.push(responseBody)
            }
            return roots
        })
        core.setOutput('roots', roots)
    } catch (e) {
        core.setFailed(e.message)
        throw e
    }
}

start()
