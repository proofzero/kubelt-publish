// For generating carfiles:
const packDAG = require('./pack.js')
const { packToFs } = require('ipfs-car/pack/fs')
const { FsBlockStore } = require('ipfs-car/blockstore/fs')
//const { CarReader } = require('@ipld/car');

// TODO: In-mem only?
//const { packToBlob } = require('ipfs-car/pack/blob')
//const { MemoryBlockStore } = require('ipfs-car/blockstore/memory')

// For generating our own keys:
const crypto = require('libp2p-crypto')

// For calculating content names:
const PeerId = require('peer-id')
const { CID } = require('multiformats/cid')
const { base36 } = require('multiformats/bases/base36')

// For HTTP comms:
const http = require('http')
const https = require('https')
const fetch = require('node-fetch-retry')
const FormData = require('multi-part')

// For filesystem ops:
const fs = require('fs/promises')
const path = require('path')
const tmp = require('tmp-promise')
const util = require('util')
const glob = util.promisify(require('glob'))

async function getContentName(publishingKey) {
    const peer = await PeerId.createFromPrivKey(publishingKey.bytes)
    const peerId = peer.toString()
    const cid = CID.parse(peerId)
    return cid.toString(base36)
}

async function getPublishingKey(protobufKey, name) {
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
    const sanitized_as = as || ''
    return (sanitized_as.match("^dag$|^file$|^dir$|^wrap$") || ['dag'])[0]
}

async function isValidSpec(as, filepath) {
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
}

async function getDAGCarfile(filepath) {
    let tempfile = null
    return tmp.file()
        .then(async f => {
            tempfile = f
            return fs.readFile(filepath)
                .then(async text => {
                    const codec = 'dag-cbor'
                    return await packDAG.writeCarFile(tempfile.path, codec, JSON.parse(text))
                })
                .then(async (carfile) => Promise.all([fs.open(tempfile.path), carfile]))
        })
}

async function getFileForm(filepath) {
    return fs.open(filepath)
        .then(async fd => {
            const form = new FormData()
            form.append('data', fd.createReadStream())
            return { form, fd }
        })
}

async function getDirectoryCarfile(filepath, wrapDirectory) {
    let tempfile = null
    return tmp.file().then(async f => {
        tempfile = f
        await packToFs({
            input: filepath,
            output: tempfile.path,
            wrapWithDirectory: wrapDirectory,
        })
    }).then(async () => fs.open(tempfile.path))
}

async function getBody(as, filepath) {
    return isValidSpec(as, filepath)
        .then(valid => {
            if (!valid) {
                throw ('Invalid as/file pairing:', as, filepath)
            }

            switch (as) {
                case 'dag': {
                    return getDAGCarfile(filepath)
                }
                case 'file': {
                    return getFileForm(filepath)
                }
                case 'dir':
                case 'wrap': {
                    const wrapDirectory = 'wrap' == as
                    return getDirectoryCarfile(filepath, wrapDirectory)
                }
                default: {
                    throw ('Invalid "as" parameter: ', as)
                }
            }
        })
}

async function start(secret, globspec, namespec, core, domain, published, skip, as, limit = -1, endpoint = 'https://api.pndo.xyz') {
    return glob(globspec).then(async files => {
        const limiter = limit < 0 ? files.length : limit
        const requestMap = files.slice(0, limiter).map(async file => {
            const humanName = getHumanName(namespec, file)

            let publishingKey = null

            // If we're skipping key generation, publish with the secret key.
            if (skip) {
                publishingKey = await crypto.keys.unmarshalPrivateKey(Buffer.from(secret, 'base64'))
            } else {
                publishingKey = await getPublishingKey(Buffer.from(secret, 'base64'), humanName)
            }

            const contentName = await getContentName(publishingKey)

            // TODO: Should be publishing key?
            const protocolPubKey = crypto.keys.marshalPublicKey(publishingKey)
            const encodedPubKey = protocolPubKey.toString('base64')

            const [ body, carfile ] = await getBody(as, file)
            let headers = null

            // File types are sent through form data so need the multiparts.
            if ('file' == as) {
                headers = body.form.getHeaders()
            }

            const options = {
                method: 'POST',
                headers: {
                    ...headers,
                    'X-Metadata': JSON.stringify({
                        'published': published,
                        'human': humanName,
                        'path': file,
                        'as': as,
                    }),
                    'X-Public-Key': encodedPubKey, // TODO: publishing key?
                    'X-Signature': encodedPubKey, // TODO: publishing key?
                },
                retry: 3,      // node-fetch-retry option -- number of attempts
                pause: 500,    // node-fetch-retry option -- millisecond delay
                silent: true,  // node-fetch-retry option -- eat console output?
            }

            // File types are sent through form data so need the encoded body.
            if ('file' == as) {
                options.body = body.form.stream()
            } else {
                options.body = await body.readFile()//body.createReadStream()
                body.close()
            }

            // If we're overriding the domain, use the override (for testing).
            const urlbase = endpoint || domain

            ////////////////////////////////////////////////////////////////////
            // TODO: Needs refactor. Uses v1 endpoint for speed.
            ////////////////////////////////////////////////////////////////////
            let v1_promise = null
            if ('dag' == as) {
                const cid = carfile.roots[0].toString()
                const url_v1 = new URL(humanName, new URL('/v0/api/content/' + core + '/', urlbase))
                //console.log(url_v1.toString())
                v1_promise = fs.open(file)
                    .then(async fd => {
                        const opts = options //JSON.parse(JSON.stringify(options))
                        opts.headers['content-type'] = 'application/json'
                        opts.headers['accept'] = 'application/json'
                        opts.headers['x-cid'] = cid
                        opts.body = await fd.readFile()//createReadStream()
                        fd.close()

                        return fetch(url_v1, opts)
                            .then(r => r.json()).then(j => {
                                //fd.close()
                                j.metadata.box.name = '/' + core + '/' + humanName
                                j.metadata.box.cid = cid.toString()
                                j.metadata.box.key = encodedPubKey
                                return j
                            })
                    })
            }
            ////////////////////////////////////////////////////////////////////

            // Make recalls to the previous API version fire-and-forget:

            /*const url = new URL(contentName, new URL('/last/api/content/kbt/', urlbase))
            let v0_request = null

            /*options.port = url.port
            options.hostname = url.hostname
            options.protocol = url.protocol
            options.path = url.pathname

            v0_request = 'https:' == options.protocol.toLowerCase() ? https.request(options) : http.request(options)

            if ('file' != as) {
                v0_request.write(await body.readFile())
                body.close()
            } else {
                v0_request.write(await body.fd.readFile())
                body.fd.close()
            }

            v0_request.end()

            /*fetch(url, options)
                .then(response => response.json())
                .then(json => {
                    json.metadata.box.name = '/' + core + '/' + humanName
                    json.metadata.box.key = encodedPubKey
                    return json
                })
                .catch(e => { console.log('failed at url: ', url, e) })
                .finally(() => {
               })

            if (v0_request && v1_promise) {
                // Fire Estuary and Wasabi, but resolve when one comes back.
                return Promise.any([v0_request, v1_promise])
            } else {
                return v0_request || v1_promise
            }/**/
            return v1_promise
        })

        return Promise.all(requestMap)
    })
}

module.exports = {
    getContentName,
    getPublishingKey,
    getHumanName,
    getAs,
    isValidSpec,
    getDAGCarfile,
    getFileForm,
    getDirectoryCarfile,
    getBody,
    start,
}
