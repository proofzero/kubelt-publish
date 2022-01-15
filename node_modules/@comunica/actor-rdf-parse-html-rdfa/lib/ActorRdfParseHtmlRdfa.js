"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorRdfParseHtmlRdfa = void 0;
const bus_rdf_parse_html_1 = require("@comunica/bus-rdf-parse-html");
const rdfa_streaming_parser_1 = require("rdfa-streaming-parser");
/**
 * A comunica RDFa RDF Parse Html Actor.
 */
class ActorRdfParseHtmlRdfa extends bus_rdf_parse_html_1.ActorRdfParseHtml {
    constructor(args) {
        super(args);
    }
    async test(action) {
        return true;
    }
    async run(action) {
        var _a;
        const mediaType = action.headers ? action.headers.get('content-type') : null;
        const language = (_a = (action.headers && action.headers.get('content-language'))) !== null && _a !== void 0 ? _a : undefined;
        const profile = mediaType && mediaType.includes('xml') ? 'xhtml' : 'html';
        const htmlParseListener = new rdfa_streaming_parser_1.RdfaParser({ baseIRI: action.baseIRI, profile, language });
        htmlParseListener.on('error', action.error);
        htmlParseListener.on('data', action.emit);
        const onTagEndOld = htmlParseListener.onEnd;
        htmlParseListener.onEnd = () => {
            onTagEndOld.call(htmlParseListener);
            action.end();
        };
        return { htmlParseListener };
    }
}
exports.ActorRdfParseHtmlRdfa = ActorRdfParseHtmlRdfa;
//# sourceMappingURL=ActorRdfParseHtmlRdfa.js.map