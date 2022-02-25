/// <reference types="node" />
import { EventEmitter } from 'events';
import type { IncomingHttpHeaders } from 'http';
export default class Requester {
    private negotiatedResources;
    constructor();
    createRequest(settings: any): EventEmitter;
    convertRequestHeadersToFetchHeaders(headers: IncomingHttpHeaders): Headers;
    private removeQuery;
}
