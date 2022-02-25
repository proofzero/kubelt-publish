/// <reference types="node" />
import { EventEmitter } from 'events';
import type { AgentOptions, IncomingHttpHeaders } from 'http';
import 'cross-fetch/polyfill';
export default class Requester {
    private readonly agents;
    constructor(agentOptions?: AgentOptions);
    createRequest(settings: any): EventEmitter;
    convertRequestHeadersToFetchHeaders(headers: IncomingHttpHeaders): Headers;
    private decode;
}
