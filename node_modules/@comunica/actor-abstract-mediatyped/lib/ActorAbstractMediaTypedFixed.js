"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActorAbstractMediaTypedFixed = void 0;
const ActorAbstractMediaTyped_1 = require("./ActorAbstractMediaTyped");
class ActorAbstractMediaTypedFixed extends ActorAbstractMediaTyped_1.ActorAbstractMediaTyped {
    constructor(args) {
        super(args);
        const scale = this.priorityScale || this.priorityScale === 0 ? this.priorityScale : 1;
        if (this.mediaTypes) {
            Object.entries(this.mediaTypes).forEach(([key, value], index) => {
                this.mediaTypes[key] = scale * value;
            });
        }
        this.mediaTypes = Object.freeze(this.mediaTypes);
        this.mediaTypeFormats = Object.freeze(this.mediaTypeFormats);
    }
    async testHandle(action, mediaType, context) {
        if (!(mediaType in this.mediaTypes)) {
            throw new Error(`Unrecognized media type: ${mediaType}`);
        }
        return await this.testHandleChecked(action, context);
    }
    async testMediaType(context) {
        return true;
    }
    async getMediaTypes(context) {
        return this.mediaTypes;
    }
    async testMediaTypeFormats(context) {
        return true;
    }
    async getMediaTypeFormats(context) {
        return this.mediaTypeFormats;
    }
}
exports.ActorAbstractMediaTypedFixed = ActorAbstractMediaTypedFixed;
//# sourceMappingURL=ActorAbstractMediaTypedFixed.js.map