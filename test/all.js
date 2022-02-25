const tap = require('tap')
const lib = require('../src/library.js')

tap.test('Test all the metadata', async t => {
    const secret_fixture = 'CAESQC7y6BZeKlnsYe/brQYgofcYF9CPB4EWtR12wEG9Wtu8m4Pce9l+YAzsMtqzm3dUj8gw/bJbDDTEAr0H9m2N7xQ='
    const globspec_fixture = 'test/metadata-sample/metadata/revealed/*'
    const namespec_fixture = 'path'
    const core_fixture = 'test'
    const domain_fixture = 'https://api.pndo.xyz'
    const published_fixture = true
    const skip_fixture = false
    const as_fixture = 'dag'
    const limit = 1000

    // Assumes `wrangler dev` is serving the pando worker locally.
    const test_endpoint = 'http://127.0.0.1:8787'

    // TODO: This should take a mock because it fires requests.
    const results = await lib.start(secret_fixture,
        globspec_fixture,
        namespec_fixture,
        core_fixture,
        domain_fixture,
        published_fixture,
        skip_fixture,
        as_fixture,
        limit,
        test_endpoint)

    console.log(JSON.stringify(results))

    t.end()
})
