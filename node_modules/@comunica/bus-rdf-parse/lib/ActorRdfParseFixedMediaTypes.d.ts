import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import type { IActorTest } from '@comunica/core';
import type { IActionRdfParse, IActorRdfParseOutput } from './ActorRdfParse';
/**
 * A base actor for listening to RDF parse events that has fixed media types.
 *
 * Actor types:
 * * Input:  IActionRdfParseOrMediaType:      A parse input or a media type input.
 * * Test:   <none>
 * * Output: IActorOutputRdfParseOrMediaType: The parsed quads.
 *
 * @see IActionInit
 */
export declare abstract class ActorRdfParseFixedMediaTypes extends ActorAbstractMediaTypedFixed<IActionRdfParse, IActorTest, IActorRdfParseOutput> implements IActorRdfParseFixedMediaTypesArgs {
    constructor(args: IActorRdfParseFixedMediaTypesArgs);
    testHandleChecked(action: IActionRdfParse): Promise<boolean>;
}
export interface IActorRdfParseFixedMediaTypesArgs extends IActorArgsMediaTypedFixed<IActionRdfParse, IActorTest, IActorRdfParseOutput> {
}
