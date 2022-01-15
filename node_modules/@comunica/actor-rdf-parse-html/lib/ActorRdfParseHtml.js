"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorRdfParseHtml = void 0;
const stream_1 = require("stream");
const bus_rdf_parse_1 = require("@comunica/bus-rdf-parse");
const WritableStream_1 = require("htmlparser2/lib/WritableStream");
/**
 * A comunica HTML RDF Parse Actor.
 * It creates an HTML parser, and delegates its events via the bus-rdf-parse-html bus to other HTML parsing actors.
 */
class ActorRdfParseHtml extends bus_rdf_parse_1.ActorRdfParseFixedMediaTypes {
    constructor(args) {
        super(args);
    }
    async runHandle(action, mediaType, context) {
        const quads = new stream_1.Readable({ objectMode: true });
        quads._read = async () => {
            // Only initialize once
            quads._read = () => {
                // Do nothing
            };
            // Create callbacks action
            let endBarrier = 1;
            function emit(quad) {
                quads.emit('data', quad);
            }
            function error(subError) {
                quads.emit('error', subError);
            }
            function end() {
                if (--endBarrier === 0) {
                    quads.push(null);
                }
            }
            const htmlAction = {
                baseIRI: action.baseIRI,
                context,
                emit,
                end,
                error,
                headers: action.headers,
            };
            // Register html parse listeners
            Promise.all(this.busRdfParseHtml.publish(htmlAction))
                .then(async (outputs) => {
                endBarrier += outputs.length;
                const htmlParseListeners = [];
                for (const output of outputs) {
                    const { htmlParseListener } = await output.actor.run(htmlAction);
                    htmlParseListeners.push(htmlParseListener);
                }
                // Create parser
                const parser = new WritableStream_1.WritableStream({
                    onclosetag() {
                        try {
                            for (const htmlParseListener of htmlParseListeners) {
                                htmlParseListener.onTagClose();
                            }
                        }
                        catch (error_) {
                            error(error_);
                        }
                    },
                    onend() {
                        try {
                            for (const htmlParseListener of htmlParseListeners) {
                                htmlParseListener.onEnd();
                            }
                        }
                        catch (error_) {
                            error(error_);
                        }
                        end();
                    },
                    onopentag(name, attributes) {
                        try {
                            for (const htmlParseListener of htmlParseListeners) {
                                htmlParseListener.onTagOpen(name, attributes);
                            }
                        }
                        catch (error_) {
                            error(error_);
                        }
                    },
                    ontext(data) {
                        try {
                            for (const htmlParseListener of htmlParseListeners) {
                                htmlParseListener.onText(data);
                            }
                        }
                        catch (error_) {
                            error(error_);
                        }
                    },
                }, {
                    decodeEntities: true,
                    recognizeSelfClosing: true,
                    xmlMode: false,
                });
                // Push stream to parser
                action.input.on('error', error);
                action.input.pipe(parser);
            }).catch(error);
        };
        return { quads };
    }
}
exports.ActorRdfParseHtml = ActorRdfParseHtml;
//# sourceMappingURL=ActorRdfParseHtml.js.map