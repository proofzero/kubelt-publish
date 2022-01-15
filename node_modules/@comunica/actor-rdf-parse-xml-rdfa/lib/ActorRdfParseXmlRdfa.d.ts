import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import type { ActionContext } from '@comunica/core';
/**
 * A comunica XML RDFa RDF Parse Actor.
 */
export declare class ActorRdfParseXmlRdfa extends ActorRdfParseFixedMediaTypes {
    constructor(args: IActorRdfParseFixedMediaTypesArgs);
    runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext): Promise<IActorRdfParseOutput>;
}
