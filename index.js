const lib = require('./library')
const fs = require('fs')
const path = require('path')

const core = require('@actions/core')
const fetch = require('node-fetch')
const crypto = require('libp2p-crypto')
const FormData = require('form-data')

const util = require('util')
const glob = util.promisify(require('glob'))
const exec = util.promisify(require('child_process').exec)

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
        const as = getAs(core.getInput('as', { required: false }))

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

start()
