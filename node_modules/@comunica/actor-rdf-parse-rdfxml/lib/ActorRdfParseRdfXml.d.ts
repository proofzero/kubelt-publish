import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import type { ActionContext } from '@comunica/core';
/**
 * A comunica RDF/XML RDF Parse Actor.
 */
export declare class ActorRdfParseRdfXml extends ActorRdfParseFixedMediaTypes {
    constructor(args: IActorRdfParseFixedMediaTypesArgs);
    runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext): Promise<IActorRdfParseOutput>;
}
