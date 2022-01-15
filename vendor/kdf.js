// kdf/index.js

const {
    sign,
    //verify,
    generateKeyPairFromSeed,
    //extractPublicKeyFromSecretKey,
    //convertPublicKeyToX25519,
    //convertSecretKeyToX25519
} = require('@stablelib/ed25519')

const { encode, decode } = require('@stablelib/base64')
const sha256 = require('@stablelib/sha256')
const pbkdf2 = require('@stablelib/pbkdf2')

// This is a toy implementation of our KDF algorithm, for reference.
//
// Scenario: wallet account CMS dapp login, me dag recovery, content naming.
//
// 1. We log into a wallet account.
// 2. We enter a passphrase to log into the dapp.
// 3. We ask the wallet to sign the passphrase with a dapp-specific salt.
// 4. We use the signed passphrase to seed generation of master key material.
// 5. We use the master key material to retrieve the user's Me Dag and then
//    name three pieces of content.

// Test key from the stablelib test suite. Not secure.
// cf. https://github.com/StableLib/stablelib/blob/master/packages/ed25519/ed25519.test.ts#L10
const user_keys = decode('nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2DXWpgBgrEKt9VL/tPJZAc6DuFy89qmIyWvAhpo9wdRGg==')
const user_privateKey = user_keys//.subarray(0, 31) // The ed25519 library says the whole key is secret.
const user_publicKey = user_keys.subarray(32, 64)
console.log('User\'s private key (base64):\t', encode(user_privateKey))
console.log('User\'s public key (base64):\t', encode(user_publicKey))

// The user enters this phrase and we ask their wallet to sign it.
const secretDappLoginPassword = 'this is my dapp login passphrase'
console.log('Dapp secret phrase:\t\t', secretDappLoginPassword)

// Each dapp needs a specific salt so that the user data is specific to that
// dapp. This is passed to us by the dapp as a configuration param.
// TODO: The SDK needs to accept a dapp salt config.
const dappSalt = 'this is the kubelt CMS dapp salt123'
console.log('Dapp salt:\t\t\t', dappSalt)

// TODO: This is SDK logic for returning master key material -------------------
// The secret password and the dapp salt form the message we get signed.
const message = secretDappLoginPassword + dappSalt

// The passphrase is signed (ed25519) by the user's private key.
// TODO: ed25519 keygen (below) requires a 32 byte seed. The generated signature
// is 64 bytes. We take the front half of the array. Is this correct? Is entropy
// uniform across the signature? Is it higher in the second half (MSB vs LSB)?
const entropy = sign(user_privateKey, message).subarray(0, 32)
console.log('Unsigned dapp seed:\t\t', message)
console.log('Signed dapp seed:\t\t', encode(entropy))
console.log('Seed length:\t\t\t', entropy.length)

// The signed passphrase is used to seed generation of master key material.
const masterKeyMaterial = generateKeyPairFromSeed(entropy)
console.log('Master public key:\t\t', encode(masterKeyMaterial.publicKey))
console.log('Master secret key:\t\t', encode(masterKeyMaterial.secretKey))
// -----------------------------------------------------------------------------

// Now let's resovle the Me DAG:
const length = 64 // TODO: Make our actual key length.

const me_dag_name = 'medag'
const iterations = 10 // TODO: What is a good base value here?

// TODO: Does the secret key make sense here?
// TODO: Should we pass the content name as the password or salt?
// TODO: Swap for a faster hash function?
// TODO: SDK generateName()
const name_key = pbkdf2.deriveKey(sha256.SHA256, masterKeyMaterial.secretKey, me_dag_name, iterations, length)
console.log('\n', '\tcontent name:\t', me_dag_name, '\n\tkey:\t\t', encode(name_key), '\n\tname:\t\t', encode(sha256.hash(name_key)))

// Now the user wants to publish a bunch of content so let's generate names.
const humanReadableContentNames = [
    'this is the name of my metadata content',
    'this is another content name for my logo',
    'this is named french legal text content',
]

for (i = 0; i < humanReadableContentNames.length; i++) {
    // TODO: Swap for a faster hash function?
    // TODO: blake3 argon?
    // TODO: Just using i for iterations, but what is a good value?
    // TODO: SDK generateName()
    const dk = pbkdf2.deriveKey(sha256.SHA256, humanReadableContentNames[i], masterKeyMaterial, i, length)
    console.log('\n', '\tcontent name:\t', humanReadableContentNames[i], '\n\tkey:\t\t', encode(dk), '\n\tname:\t\t', encode(sha256.hash(dk)))
}
