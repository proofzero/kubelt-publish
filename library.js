// For generating our own keys:
const crypto = require('libp2p-crypto')

// For calculating content names:
const PeerId = require('peer-id')
const { CID } = require('multiformats/cid')
const { base36 } = require('multiformats/bases/base36')

// For HTTP comms:
const fetch = require('node-fetch')
const FormData = require('form-data')

// For filesystem ops:
const fs = require('fs/promises')
const path = require('path')
const util = require('util')
const glob = util.promisify(require('glob'))
const exec = util.promisify(require('child_process').exec)

module.exports = {
    // tested
    getContentName: async (publishingKey) => {
        const peer = await PeerId.createFromPrivKey(publishingKey.bytes)
        const peerId = peer.toString()
        const cid = CID.parse(peerId)
        return cid.toString(base36)
    },
    // tested
    getPublishingKey: async (protobufKey, name) => {
        // Get the key object out of the protobuf.
        const masterKeyMaterial = await crypto.keys.unmarshalPrivateKey(protobufKey)

        // Sign the human name to seed the generation of a publishing key for it.
        // TODO: Use a 32 bit hash (blake2). Plus disambiguating context.
        const signature = await masterKeyMaterial.sign(Buffer.from(name))

        // ed25519 seeds must be 32 bytes. What's the uniformity of entropy?
        const seedStartIndex = 0
        const seedLength = 32
        const seed = signature.slice(seedStartIndex, seedLength)

        // Return a 2048 bit ed25519 keypair with the above seed.
        const algo = 'ed25519'
        const bitwidth = 2048
        return crypto.keys.generateKeyPairFromSeed(algo, seed, bitwidth)
    },
    // tested
    getHumanName: (namespec, filepath) => {
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
    },
    // tested
    // Sanitize the "as" input parameter.
    getAs: (as) => {
        // Restrict the "as" parameter to either "dag", "file", "dir", or "wrap".
        // Default to "dag".
        const sanitized_as = as || ''
        return (sanitized_as.match("^dag$|^file$|^dir$|^wrap$") || ['dag'])[0]
    },
    // tested
    isValidSpec: async (as, filepath) => {
        try {
            const inodeStat = await fs.lstat(filepath)

            // We're being asked to pack a dag or a file and are passed a file.
            const validFileSpec = ("dag" == as || "file" == as) && inodeStat.isFile()

            // We're being asked to pack a directory and are passed a directory.
            const validDirSpec = ("dir" == as || "wrap" == as) && inodeStat.isDirectory()

            // Either of the above statements is true.
            return validFileSpec || validDirSpec
        } catch (e) {
            return false
        }
    },
    // tested
    getDAGForm: async (form, filepath) => {
        return exec(`node ${__dirname}/vendor/cli.js courtyard convert "${filepath}"`)
            .then(async () => fs.open('./output.car'))
            .then(async (fd) => {
                form.append('data', fd.createReadStream())
            })
    },
    // tested
    getFileForm: async (form, filepath) => {
        return fs.open(filepath)
            .then(async fd => {
                form.append('data', fd.createReadStream())
            })
    },
    // tested
    getDirectoryForm: async (form, filepath, wrapDirectory) => {
        return exec(`node ${__dirname}/node_modules/ipfs-car/dist/cjs/cli/cli.js --pack ${filepath} --output output.car --wrapWithDirectory ${wrapDirectory}`)
            .then(async () => fs.open('./output.car'))
            .then(async (fd) => {
                form.append('data', fd.createReadStream())
            })
    },
    getForm: async (as, filepath) => {
        if (!await lib.isValidSpec(as, filepath)) {
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
    },
    start: async (secret, globspec, namespec, published, as) => {
        try {
            const roots = await glob(globspec).then(async files => {
                const requestMap = files.slice(0, 5).map(async file => {
                    const humanName = lib.getHumanName(namespec, file)
                    const publishingKey = await lib.getPublishingKey(Buffer.from(secret, 'base64'), humanName)
                    const contentName = await lib.getContentName(publishingKey)

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
}
