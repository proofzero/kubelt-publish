const lib = require('./library')
const core = require('@actions/core')

const secret    = core.getInput('secret', { required: true  })
const globspec  = core.getInput('glob',   { required: true  })
const namespec  = core.getInput('name',   { required: false }) || 'path'

const published = core.getBooleanInput('published', {required: false}) || false
const as = lib.getAs(core.getInput('as',  { required: false }))

(async () => {
    core.setOutput('roots', await lib.start(secret, globspec, namespec, published, as))
})()
