import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import type { IActionRdfParseHtml, IActorRdfParseHtmlOutput } from '@comunica/bus-rdf-parse-html';
import type { ActionContext, Actor, Bus, IActorTest } from '@comunica/core';
/**
 * A comunica HTML RDF Parse Actor.
 * It creates an HTML parser, and delegates its events via the bus-rdf-parse-html bus to other HTML parsing actors.
 */
export declare class ActorRdfParseHtml extends ActorRdfParseFixedMediaTypes {
    private readonly busRdfParseHtml;
    constructor(args: IActorRdfParseHtmlArgs);
    runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext): Promise<IActorRdfParseOutput>;
}
export interface IActorRdfParseHtmlArgs extends IActorRdfParseFixedMediaTypesArgs {
    busRdfParseHtml: Bus<Actor<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>, IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>;
}
