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

async function getContentName(publishingKey) {
    const peer = await PeerId.createFromPrivKey(publishingKey.bytes)
    const peerId = peer.toString()
    const cid = CID.parse(peerId)
    return cid.toString(base36)
}

async function getPublishingKey(secret, name) {
    // Get the key object out of the protobuf.
    const secretKey = await crypto.keys.unmarshalPrivateKey(secret)

    // Sign the human name to seed the generation of a publishing key for it.
    // TODO: Use a 32 bit hash (blake2). Plus disambiguating context.
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
            // Strip off the extension if it exists. TODO: Remove?
            //const ext = namebase.lastIndexOf('.')
            name = namebase//ext < 0 ? namebase : namebase.substring(0, ext)
        break
        default:
            throw(`Unexpected namespec ${namespec}. Should be 'path'.`)
    }
    return name
}

// Sanitize the "as" input parameter.
function getAs(as) {
    // Restrict the "as" parameter to either "dag", "file", "dir", or "wrap".
    // Default to "dag".
    return (as.match("^dag$|^file$|^dir$|^wrap$") || ['dag'])[0]
}

function isValidSpec(as, filepath) {
    const inodeStat = fs.lstatSync(filepath)

    // We're being asked to pack a dag or a file and are passed a file.
    const validFileSpec = ("dag" == as || "file" == as) && inodeStat.isFile()

    // We're being asked to pack a directory and are passed a directory.
    const validDirSpec = ("dir" == as || "wrap" == as) && inodeStat.isDirectory()

    // Either of the above statements is true.
    return validFileSpec || validDirSpec
}

async function getDAGForm(filepath) {
    const { stdin, stdout } = await exec(`node ${__dirname}/vendor/cli.js courtyard convert ${filepath}`)
    const form = new FormData()
    form.append('data', fs.createReadStream('./output.car'))
    return form
}

function getFileForm(filepath) {
    const form = new FormData()
    form.append('data', fs.createReadStream(filepath))
    return form
}

async function getDirectoryForm(filepath, wrapDirectory) {
    const { stdin, stdout } = await exec(`node ${__dirname}/node_modules/ipfs-car/dist/cjs/cli/cli.js --pack ${filepath} --output output.car --wrapWithDirectory ${wrapDirectory}`)
    const form = new FormData()
    form.append('data', fs.createReadStream('./output.car'))
    return form
}

async function getForm(as, filepath) {
    if (!isValidSpec(as, filepath)) {
        throw ('Invalid as/file pairing:', as, filepath)
    }

    let form = null

    switch(as) {
        case "dag": {
            form = await getDAGForm(filepath)
        }
        case "file": {
            form = getFileForm(filepath)
        }
        case "dir":
        case "wrap": {
            const wrapDirectory = "wrap" == as
            form = await getDirectoryForm(filepath, wrapDirectory)
        }
        default: {
            throw ('Invalid "as" parameter: ', as)
        }
    }

    return form
}

async function start() {
    try {
        const secret = core.getInput('secret', { required: true })
        const globspec = core.getInput('glob', { required: true })
        const namespec = core.getInput('name', { required: false }) || 'path'
        const published = core.getBooleanInput('published', { required: false }) || false
        const as = getAs(core.getInput('as', {required: false}))

        const roots = await glob(globspec).then(async files => {
            const requestMap = files.subarray(0, 5).map(async file => {
                const humanName = getHumanName(namespec, file)
                const publishingKey = await getPublishingKey(Buffer.from(secret, 'base64'), humanName)
                const contentName = await getContentName(publishingKey)

                // TODO: Should be private key?
                const protocolPubKey = crypto.keys.marshalPublicKey(publishingKey)
                const encodedPubKey = protocolPubKey.toString('base64')

                const form = await getForm(as, file)
                const options = {
                    method: 'POST',
                    headers: {
                        ...form.headers,
                        'X-Metadata': JSON.stringify({
                            'published': published,
                            'human': humanName,
                            'path': file,
                            'as': as,
                        }),
                        'X-Public-Key': encodedPubKey, // TODO: private key?
                    },
                }
                options.body = form

                // TODO: Figure out `act` for local dev.
                //const url = new URL(name, 'http://127.0.0.1:8787/v0/api/content/kbt/')
                const url = new URL(contentName, 'https://api.pndo.xyz/v0/api/content/kbt/')
                return fetch(url, options).then(response => response.json())
            })

            return Promise.all(requestMap)
        })
        core.setOutput('roots', roots)
    } catch (e) {
        console.log(e)
        core.setFailed(e.message)
        throw e
    }
}

start()
