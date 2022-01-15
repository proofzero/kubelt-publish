import type { IActionRdfParseHtml, IActorRdfParseHtmlOutput } from '@comunica/bus-rdf-parse-html';
import { ActorRdfParseHtml } from '@comunica/bus-rdf-parse-html';
import type { IActorArgs, IActorTest } from '@comunica/core';
/**
 * A comunica Microdata RDF Parse Html Actor.
 */
export declare class ActorRdfParseHtmlMicrodata extends ActorRdfParseHtml {
    constructor(args: IActorArgs<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>);
    test(action: IActionRdfParseHtml): Promise<IActorTest>;
    run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput>;
}
