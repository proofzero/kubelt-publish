const path = require('path')
const PeerId = require('peer-id')
const { CID } = require('multiformats/cid')
const { base36 } = require('multiformats/bases/base36')
const crypto = require('libp2p-crypto')

module.exports = {
    getContentName: async (publishingKey) => {
        const peer = await PeerId.createFromPrivKey(publishingKey.bytes)
        const peerId = peer.toString()
        const cid = CID.parse(peerId)
        return cid.toString(base36)
    },
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
    }
}
