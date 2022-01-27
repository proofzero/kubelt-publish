const fs = require('fs')
const path = require('path')
const util = require('util')

const core = require('@actions/core')
const fetch = require('node-fetch')
const sha256 = require('@stablelib/sha256')
const FormData = require('form-data')

const glob = util.promisify(require('glob'))
const exec = util.promisify(require('child_process').exec)

// If a path is a directory, recursively add all files within it to the form-data object.
/*async function recurseDirectory(form, prefix, pathname) {
    await glob(path.join(pathname, '**')).then(async entries => {
        for (let i = 0; i < entries.length; i++) {
            const lstat = fs.lstatSync(entries[i])
            if (lstat.isDirectory()) {
                // The first path the glob enumerates is the current path, skip.
                if (path.normalize(pathname) != path.normalize(entries[i])) {
                    recurseDirectory(form, prefix + i + '_', entries[i])
                }
            } else if (lstat.isFile()) {
                form.append(prefix + i, fs.createReadStream(entries[i]))
            } else {
                throw('Unrecognized lstat: ', JSON.stringify(lstat))
            }
        }
    })
}*/

async function start() {
    try {
        const secret = core.getInput('secret', { required: true })
        const globspec = core.getInput('glob', { required: true })
        const published = core.getBooleanInput('published', { required: false }) || false

        // Restrict the "as" parameter to either "dag", "file", or "dir", defaulting to "dag".
        const as = (core.getInput('as', { required: false }).match("^dag$|^file$|^dir$") || ['dag'])[0]

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
                } else if ("dir" == as) {
                    if (!inodeStat.isDirectory()) {
                        throw ('"dir" parameter requires a directory, got: ', JSON.stringify(inodeStat))
                    }
                    // TODO: Use a secure upload key and do this client-side?
                    // TODO: Pack the directory by adding all the files to the body.
                    // TODO: What if there are duplicate names? Is there a path differentiator?
                    const { stdin, stdout } = await exec(`node ${__dirname}/node_modules/ipfs-car/dist/cjs/cli/cli.js --pack ${files[i]} --output output.car`)
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
 
                // TODO: Calculate the name so we can build it into the URL.
                const name = Buffer.from(sha256.hash(secret + files[i])).toString('hex')

                // TODO: Figure out how to make work with `act` for local dev.
                //const url = new URL(name, 'http://127.0.0.1:8787/v0/api/content/kbt/')
                const url = new URL(name, 'https://api.pndo.xyz/v0/api/content/kbt/')
                //console.log(url)

                // Push the CID into the roots list.
                responseBody = await fetch(url, options).then(response => response.json())
                responseBody.metadata.box.name = `/kbt/${name}`
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
