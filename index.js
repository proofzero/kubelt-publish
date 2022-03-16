const lib = require('./src/library.js')
const core = require('@actions/core')

const secret    = core.getInput('secret', { required: true  })
const globspec  = core.getInput('glob',   { required: true  })
const namespec  = core.getInput('name',   { required: false }) || 'path'
const corename  = core.getInput('core',   { required: false }) || 'kbt'
const domain    = core.getInput('domain', { required: false }) || 'https://api.pndo.xyz'

const published = core.getBooleanInput('published', {required: false}) || false

const as = lib.getAs(core.getInput('as',  { required: false }))

async function go () {
    core.setOutput('roots', await lib.start(secret,
        globspec,
        namespec,
        corename,
        domain,
        published,
        true, // deprecate skip
        as))
}

go()
