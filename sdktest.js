const util = require('util')
const exec = util.promisify(require('child_process').exec)

async function start() {
    const { stdin, stdout } = await exec(`node ${__dirname}/vendor/cli.js courtyard convert ./unrevealed.json`)
}

start()

