const tap = require('tap')
const lib = require('../library')

tap.test('We get the right content names', async t => {
    // This simulates what is stored in the Github Secret: a base64 encoded
    // protobuf containing a libp2p key.
    const base64_SECRET_KEY = 'CAESQNCzosaz9m4t4MQgFEuHIjicXYOLhk5Ee+/i4+AisAqR1VMaS460TQzZND3dtS0aS4f6qTYnryAWcWJfYlXWFlM='

    // This is the human-readable content name.
    const human_name = 'my_content.jpg'

    // Generate the key for that name.
    const publishing_key = await lib.getPublishingKey(Buffer.from(base64_SECRET_KEY, 'base64'), human_name)

    // Validate that the key gives us the right content name.
    const content_name = await lib.getContentName(publishing_key)
    t.equal(content_name, 'k51qzi5uqu5dgthudpht2my9zr9v80xyz9c41fylhm9kzu8rj8jt8w3ivs0d5g')
    t.end()
})

tap.test('We get valid human names', t => {
    const namespec = 'path'
    const filepath = 'alex/is/a/test/machine'
    const human_name = lib.getHumanName(namespec, filepath)
    t.equal(human_name, 'machine')
    t.end()
})

tap.test('Test the "as" parameter', t => {
    // Positive tests:
    const as_dag = 'dag'
    t.equal(as_dag, lib.getAs(as_dag))

    const as_file = 'file'
    t.equal(as_file, lib.getAs(as_file))

    const as_dir = 'dir'
    t.equal(as_dir, lib.getAs(as_dir))

    const as_wrap = 'wrap'
    t.equal(as_wrap, lib.getAs(as_wrap))

    // Negative tests:
    const as_bad = 'this_is_a_bad_as_parameter'
    t.equal(as_dag, lib.getAs(as_bad))

    const as_empty = ''
    t.equal(as_dag, lib.getAs(as_empty))

    const as_null = null
    t.equal(as_dag, lib.getAs(as_null))

    const as_undef = undefined
    t.equal(as_dag, lib.getAs(as_undef))

    t.end()
})
