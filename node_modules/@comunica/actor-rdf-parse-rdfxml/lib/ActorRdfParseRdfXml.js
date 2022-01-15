"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorRdfParseRdfXml = void 0;
const bus_rdf_parse_1 = require("@comunica/bus-rdf-parse");
const rdfxml_streaming_parser_1 = require("rdfxml-streaming-parser");
/**
 * A comunica RDF/XML RDF Parse Actor.
 */
class ActorRdfParseRdfXml extends bus_rdf_parse_1.ActorRdfParseFixedMediaTypes {
    constructor(args) {
        super(args);
    }
    async runHandle(action, mediaType, context) {
        action.input.on('error', error => quads.emit('error', error));
        const quads = action.input.pipe(new rdfxml_streaming_parser_1.RdfXmlParser({ baseIRI: action.baseIRI }));
        return {
            quads,
            triples: true,
        };
    }
}
exports.ActorRdfParseRdfXml = ActorRdfParseRdfXml;
//# sourceMappingURL=ActorRdfParseRdfXml.js.map