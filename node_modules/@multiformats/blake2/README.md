# @multiformats/blake2

[BLAKE2](https://blake2.net/) multihash hashers for [multiformats](https://github.com/multiformats/js-multiformats).

`MultihashHashers`s are exported from this library, they produce `MultihashDigest`s. Details about these can be found in the [multiformats multihash interface definitions](https://github.com/multiformats/js-multiformats/blob/master/src/hashes/interface.ts).

```js
import * as Block from 'multiformats/block'
import * as codec from '@ipld/dag-cbor'
import { blake2b256 as hasher } from '@multiformats/blake2/blake2b'

async function run () {
  const value = { hello: 'world' }
  const block = await Block.encode({ value, hasher, codec })
  console.log(block.cid)
  // -> CID(bafy2bzacedtxqx7k666ugf5mmagr2fxmbpfncbcji5jfg5uduausgb62y3av4)
}

run().catch(console.error)
```

## Usage

The `@multiformats/blake2/blake2b` package exports `blake2bX` `MultihashHasher`s, where `X` is the output length in bits. The Multicodecs [table](https://github.com/multiformats/multicodec/blob/master/table.csv) defines 64 different output lengths for **BLAKE2b**, from `8` to `512`.

The `@multiformats/blake2/blake2s` package exports `blake2sX` `MultihashHasher`s, where `X` is the output length in bits. For **BLAKE2s**, there are 32 different output lengths, from `8` to `256`.

e.g. `blake2b-256`, multicodec code `0xb220`, may be imported as:

```js
import { blake2b256 } from '@multiformats/blake2/blake2b'
```

while `blake2s-256`, multicodec code `0xb260`, may be imported as:

```js
import { blake2s256 } from '@multiformats/blake2/blake2s'
```

## License

Licensed under either of

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
