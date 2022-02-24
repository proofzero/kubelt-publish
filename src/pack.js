// pack.js

const fs = require('fs');
const { Readable } = require('stream');

const Block = require('multiformats/block');
const dagCBOR = require('@ipld/dag-cbor');
const dagJSON = require('@ipld/dag-json');
const { CID } = require('multiformats/cid');
const { CarWriter } = require('@ipld/car');
const { sha256 } = require('multiformats/hashes/sha2');


// Build a CAR using the given object. Returns the CID and a Buffer
// containing the serialized block.
//
// NB: using dag-json to generate a CAR and then attempting to import it
// via:
//   $ ipfs dag import example.car
// results in the error:
//   Error: unrecognized object type: 297
//
const buildCar = async (codecName, dataObj) => {
    let codec = dagJSON;
    if ('dag-cbor' == codecName) {
        codec = dagCBOR;
    } else if ('dag-json' == codecName) {
        codec = dagJSON;
    } else {
        throw "codec should be 'dag-cbor' or 'dag-json'";
    }

    const rootBlock = await Block.encode({
        value: dataObj,
        hasher: sha256,
        codec: codec,
    });

    return {
        blocks: [rootBlock],
        roots: [rootBlock.cid],
    };
};

const writeCar = async (outStream, codecName, dataObj) => {
    const { blocks, roots } = await buildCar(codecName, dataObj);
    const { writer, out } = await CarWriter.create(roots);

    Readable.from(out).pipe(outStream);

    for (const block of blocks) {
        await writer.put(block);
    }

    await writer.close();

    return {
        blocks,
        roots,
    };
};

/*
writeCarFile('output.car', 'dag-cbor', {
    x: ["alpha", "beta"],
});
*/
const writeCarFile = async (fileName, codecName, dataObj) => {
    const fileStream = fs.createWriteStream(fileName);
    const car = await writeCar(fileStream, codecName, dataObj);
    return car
};

module.exports = {
    buildCar,
    writeCar,
    writeCarFile,
};
