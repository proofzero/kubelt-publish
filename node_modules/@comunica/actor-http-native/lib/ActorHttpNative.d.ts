import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import 'cross-fetch/polyfill';
/**
 * A comunica Follow Redirects Http Actor.
 */
export declare class ActorHttpNative extends ActorHttp {
    private readonly userAgent;
    private readonly requester;
    constructor(args: IActorHttpNativeArgs);
    static createUserAgent(): string;
    test(action: IActionHttp): Promise<IMediatorTypeTime>;
    run(action: IActionHttp): Promise<IActorHttpOutput>;
}
export interface IActorHttpNativeArgs extends IActorArgs<IActionHttp, IMediatorTypeTime, IActorHttpOutput> {
    agentOptions?: string;
}
