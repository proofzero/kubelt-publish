const lib = require('../src/library.js')
const http = require('http')
const https = require('https')

async function start() {
    const encodedPubKey = 'abc123'
    const published = true
    const humanName = 'alex'
    const as = 'dag'
    const file = './test/fixtures/unrevealed.json'

    const [ body, carfile ] = await lib.getBody(as, file)

    const urlbase = 'http://127.0.0.1:8787/last/api/content/kbt/' + humanName
    const url = new URL(urlbase)
    console.log(url.toString())

    const options = {
        port: url.port,
        hostname: url.hostname,
        protocol: url.protocol,
        path: url.pathname,
        method: 'POST',
        headers: {
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

    let v0_promise = 'https:' == options.protocol.toLowerCase() ? https.request(options) : http.request(options)
    v0_promise.write(await body.readFile())
    v0_promise.end()

    body.close()
}

start()
