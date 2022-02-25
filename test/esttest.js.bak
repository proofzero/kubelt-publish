const tap = require('tap')
const lib = require('../src/library.js')
const fetch = require('node-fetch')

tap.test('Direct estuary call', async t => {
    const FormData = require('multi-part')
    const dag_fixture = './test/fixtures/unrevealed.json'

    // Make a form-data object, pack up a DAG, and add the stream to the form.
    const [fd, file] = await lib.getDAGCarfile(dag_fixture)

    const options = {
        method: 'POST',
        headers: {
            "Authorization": "Bearer EST4f2b5b94-e8f0-410b-bc0a-29a0ca2a6db7ARY ",
            "Accept": "application/json",
        },
        body: fd.createReadStream(),
    }

    console.log(await fetch('https://shuttle-4.estuary.tech/content/add-car', options)
        .then(response => response.json()))
})
